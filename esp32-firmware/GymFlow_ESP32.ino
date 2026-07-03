/*
 * ============================================================================
 *  GymFlow ESP32 — Biometric Attendance & Access Control Firmware
 * ============================================================================
 *  
 *  Hardware:
 *    - ESP32 DevKit V1
 *    - Optical Fingerprint Sensor (Adafruit_Fingerprint compatible, on Serial2)
 *    - 5V Relay Module (door lock)
 *    - RGB LED (Common Cathode)
 *    - Active Buzzer
 *
 *  Server:
 *    - GymFlow Next.js API (local or deployed)
 *
 *  Libraries (install via Arduino Library Manager):
 *    - ArduinoJson        (by Benoit Blanchon, v7.x)
 *    - Adafruit Fingerprint Sensor Library  (by Adafruit)
 *
 *  Built-in (no install needed):
 *    - WiFi.h
 *    - HTTPClient.h
 *
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>

// ============================================================================
//  USER CONFIGURATION — EDIT THESE VALUES TO MATCH YOUR SETUP
// ============================================================================

// Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server Base URL (NO trailing slash)
// Local example:   "http://192.168.1.100:3000"
// Deployed example: "https://gymflow.vercel.app"
const char* SERVER_URL = "http://192.168.1.100:3000";

// Relay Configuration
// Set to true  if your relay module opens on HIGH signal (Active HIGH)
// Set to false if your relay module opens on LOW  signal (Active LOW)
const bool RELAY_ACTIVE_HIGH = true;

// Door open duration in milliseconds
const unsigned long DOOR_OPEN_MS = 5000;  // 5 seconds

// Polling interval for check-mode (milliseconds)
const unsigned long POLL_INTERVAL_MS = 2000;  // 2 seconds

// Enrollment timeout (milliseconds) — how long to wait for a finger during enrollment
const unsigned long ENROLL_TIMEOUT_MS = 30000;  // 30 seconds

// ============================================================================
//  GPIO PIN ASSIGNMENTS — CHANGE THESE TO MATCH YOUR WIRING
// ============================================================================

// Fingerprint Sensor (Serial2)
#define FINGER_RX_PIN   16   // ESP32 RX2 ← Sensor TX (Yellow wire)
#define FINGER_TX_PIN   17   // ESP32 TX2 → Sensor RX (Green wire)

// RGB LED (Common Cathode — HIGH = ON)
#define LED_RED_PIN     26
#define LED_GREEN_PIN   25
#define LED_BLUE_PIN    33

// Buzzer (Active buzzer — HIGH = sound)
#define BUZZER_PIN      32

// Relay (Door lock)
#define RELAY_PIN       27

// ============================================================================
//  INTERNAL GLOBALS — DO NOT EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING
// ============================================================================

// Fingerprint sensor on hardware Serial2
HardwareSerial fingerSerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// State tracking
unsigned long lastPollTime = 0;
String currentMode = "standby";
String enrollMemberId = "";

// Wi-Fi reconnection tracking
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 10000;  // 10 seconds

// ============================================================================
//  SETUP
// ============================================================================

void setup() {
  // Serial monitor for debugging
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("========================================");
  Serial.println("  GymFlow ESP32 — Starting Up...");
  Serial.println("========================================");

  // Initialize GPIO pins
  pinMode(LED_RED_PIN,   OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN,  OUTPUT);
  pinMode(BUZZER_PIN,    OUTPUT);
  pinMode(RELAY_PIN,     OUTPUT);

  // Ensure everything starts OFF
  setLED(0, 0, 0);
  digitalWrite(BUZZER_PIN, LOW);
  setRelay(false);  // Door locked

  // Show startup color (yellow = initializing)
  setLED(1, 1, 0);

  // Connect to Wi-Fi
  connectWiFi();

  // Initialize fingerprint sensor
  fingerSerial.begin(57600, SERIAL_8N1, FINGER_RX_PIN, FINGER_TX_PIN);
  delay(100);

  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("[FINGER] Sensor found and verified!");
    Serial.print("[FINGER] Capacity: ");
    Serial.println(finger.capacity);
  } else {
    Serial.println("[FINGER] ERROR — Sensor not found! Check wiring.");
    // Blink red rapidly to indicate sensor error
    for (int i = 0; i < 10; i++) {
      setLED(1, 0, 0);
      delay(200);
      setLED(0, 0, 0);
      delay(200);
    }
  }

  // Read sensor parameters
  finger.getParameters();
  Serial.print("[FINGER] Status: 0x"); Serial.println(finger.status_reg, HEX);
  Serial.print("[FINGER] Database size: "); Serial.println(finger.capacity);

  // Ready
  setLED(0, 0, 0);
  Serial.println("[SYSTEM] Ready. Entering main loop...");
  Serial.println();
}

// ============================================================================
//  MAIN LOOP
// ============================================================================

void loop() {
  // Ensure Wi-Fi stays connected
  ensureWiFi();

  unsigned long now = millis();

  // Poll the server every POLL_INTERVAL_MS
  if (now - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = now;
    pollCheckMode();
  }

  // Act based on the current mode
  if (currentMode == "standby") {
    handleStandby();
  }
  else if (currentMode == "enroll") {
    handleEnroll();
    // After enrollment completes (success or fail), reset to standby polling
    currentMode = "standby";
  }
  else if (currentMode == "unlock") {
    handleUnlock();
    currentMode = "standby";  // One-shot, return to standby
  }
  else if (currentMode == "locked") {
    handleLocked();
  }
}

// ============================================================================
//  SERVER COMMUNICATION
// ============================================================================

void pollCheckMode() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(SERVER_URL) + "/api/hardware/check-mode";

  HTTPClient http;
  http.begin(url);
  http.setTimeout(5000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (!err) {
      String mode = doc["mode"].as<String>();

      if (mode == "standby") {
        currentMode = "standby";
      }
      else if (mode == "enroll") {
        currentMode = "enroll";
        enrollMemberId = doc["member_id"].as<String>();
        Serial.print("[POLL] ENROLL mode — member_id: ");
        Serial.println(enrollMemberId);
      }
      else if (mode == "unlock") {
        currentMode = "unlock";
        Serial.println("[POLL] UNLOCK mode — opening door!");
      }
      else if (mode == "locked") {
        currentMode = "locked";
      }
    } else {
      Serial.print("[POLL] JSON parse error: ");
      Serial.println(err.c_str());
    }
  } else {
    Serial.print("[POLL] HTTP error: ");
    Serial.println(httpCode);
    // Show amber (yellow) on server error
    blinkLED(1, 1, 0, 1, 300);
  }

  http.end();
}

// Send attendance scan to server
// Returns: "success", "already_marked", "access_denied", "not_found", or "error"
String sendAttendance(int fingerprintId) {
  if (WiFi.status() != WL_CONNECTED) return "error";

  String url = String(SERVER_URL) + "/api/hardware/attendance";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  JsonDocument doc;
  doc["fingerprint_id"] = fingerprintId;
  String body;
  serializeJson(doc, body);

  Serial.print("[ATTEND] Sending fingerprint_id=");
  Serial.print(fingerprintId);
  Serial.print(" → ");

  int httpCode = http.POST(body);
  String result = "error";

  if (httpCode == 200) {
    String payload = http.getString();
    JsonDocument resDoc;
    DeserializationError err = deserializeJson(resDoc, payload);

    if (!err) {
      if (resDoc.containsKey("status")) {
        result = resDoc["status"].as<String>();
        String msg = resDoc["message"].as<String>();
        Serial.print(result);
        Serial.print(" — ");
        Serial.println(msg);
      }
    }
  } else if (httpCode == 404) {
    result = "not_found";
    Serial.println("NOT FOUND (unknown fingerprint)");
  } else {
    Serial.print("HTTP error: ");
    Serial.println(httpCode);
  }

  http.end();
  return result;
}

// Send enrolled fingerprint to server
bool sendSavePrint(String memberId, int fingerprintId) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String(SERVER_URL) + "/api/hardware/save-print";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  JsonDocument doc;
  doc["member_id"] = memberId;
  doc["fingerprint_id"] = fingerprintId;
  String body;
  serializeJson(doc, body);

  Serial.print("[ENROLL] Saving print — member_id=");
  Serial.print(memberId);
  Serial.print(", fingerprint_id=");
  Serial.print(fingerprintId);
  Serial.print(" → ");

  int httpCode = http.POST(body);
  bool success = false;

  if (httpCode == 200) {
    String payload = http.getString();
    JsonDocument resDoc;
    deserializeJson(resDoc, payload);
    success = resDoc["success"] | false;
    Serial.println(success ? "SUCCESS" : "FAILED");
  } else {
    Serial.print("HTTP error: ");
    Serial.println(httpCode);
  }

  http.end();
  return success;
}

// ============================================================================
//  STATE HANDLERS
// ============================================================================

// --- STANDBY: Wait for fingerprint scan, then call attendance API ---
void handleStandby() {
  int id = scanFingerprint();

  if (id > 0) {
    // Finger matched locally — ask the server
    Serial.print("[STANDBY] Finger matched locally, ID=");
    Serial.println(id);

    // Brief yellow while we call the server
    setLED(1, 1, 0);

    String result = sendAttendance(id);

    if (result == "success" || result == "already_marked") {
      // ACCESS GRANTED
      setLED(0, 1, 0);  // Green
      buzzShort(1);
      openDoor();
      setLED(0, 0, 0);
    }
    else if (result == "access_denied") {
      // ACCESS DENIED
      setLED(1, 0, 0);  // Red
      buzzLong(1);
      delay(3000);
      setLED(0, 0, 0);
    }
    else if (result == "not_found") {
      // Finger matched locally but not on server (orphan)
      setLED(1, 0, 0);
      buzzShort(2);
      delay(3000);
      setLED(0, 0, 0);
    }
    else {
      // Server error
      setLED(1, 1, 0);  // Yellow/amber
      delay(2000);
      setLED(0, 0, 0);
    }
  }
  else if (id == -1) {
    // Finger detected but NO local match
    Serial.println("[STANDBY] Unknown finger — no local match");
    setLED(1, 0, 0);
    buzzShort(2);
    delay(2000);
    setLED(0, 0, 0);
  }
  // id == 0 means no finger detected — do nothing
}

// --- ENROLL: Full 2-step fingerprint enrollment ---
void handleEnroll() {
  Serial.println("[ENROLL] Starting enrollment process...");
  setLED(0, 0, 1);  // Blue = enrollment mode

  // Find the next available slot in the sensor
  int newId = findNextAvailableSlot();
  if (newId < 0) {
    Serial.println("[ENROLL] ERROR — Sensor storage full!");
    blinkLED(1, 0, 0, 3, 400);  // Red blink 3x
    return;
  }

  Serial.print("[ENROLL] Will store at slot #");
  Serial.println(newId);

  // === STEP 1: Get first image ===
  Serial.println("[ENROLL] Place your finger on the sensor...");
  setLED(0, 0, 1);  // Blue

  unsigned long startTime = millis();
  int p = -1;

  // Wait for finger to be placed
  while (p != FINGERPRINT_OK) {
    if (millis() - startTime > ENROLL_TIMEOUT_MS) {
      Serial.println("[ENROLL] Timeout — no finger detected");
      blinkLED(1, 0, 0, 3, 400);
      return;
    }
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      delay(100);
      continue;
    }
    if (p != FINGERPRINT_OK) {
      Serial.print("[ENROLL] Image error: 0x"); Serial.println(p, HEX);
      delay(100);
    }
  }

  Serial.println("[ENROLL] First image captured!");

  // Convert first image to template
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.print("[ENROLL] Image2Tz(1) failed: 0x"); Serial.println(p, HEX);
    blinkLED(1, 0, 0, 3, 400);
    return;
  }

  // === STEP 2: Ask user to remove finger ===
  Serial.println("[ENROLL] Remove your finger...");
  setLED(0, 1, 1);  // Cyan = remove finger
  buzzShort(1);

  // Wait for finger to be removed
  startTime = millis();
  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    if (millis() - startTime > ENROLL_TIMEOUT_MS) {
      Serial.println("[ENROLL] Timeout — finger not removed");
      blinkLED(1, 0, 0, 3, 400);
      return;
    }
    delay(100);
  }

  delay(500);

  // === STEP 3: Get second image ===
  Serial.println("[ENROLL] Place the SAME finger again...");
  setLED(0, 0, 1);  // Blue again

  startTime = millis();
  p = -1;

  while (p != FINGERPRINT_OK) {
    if (millis() - startTime > ENROLL_TIMEOUT_MS) {
      Serial.println("[ENROLL] Timeout — no second scan");
      blinkLED(1, 0, 0, 3, 400);
      return;
    }
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      delay(100);
      continue;
    }
    if (p != FINGERPRINT_OK) {
      Serial.print("[ENROLL] Second image error: 0x"); Serial.println(p, HEX);
      delay(100);
    }
  }

  Serial.println("[ENROLL] Second image captured!");

  // Convert second image to template
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.print("[ENROLL] Image2Tz(2) failed: 0x"); Serial.println(p, HEX);
    blinkLED(1, 0, 0, 3, 400);
    return;
  }

  // === STEP 4: Create model from the two templates ===
  Serial.println("[ENROLL] Creating fingerprint model...");
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.print("[ENROLL] CreateModel failed: 0x"); Serial.println(p, HEX);
    if (p == FINGERPRINT_ENROLLMISMATCH) {
      Serial.println("[ENROLL] Fingerprints did not match! Try again.");
    }
    blinkLED(1, 0, 0, 3, 400);
    return;
  }

  // === STEP 5: Store the model in the sensor's flash ===
  p = finger.storeModel(newId);
  if (p != FINGERPRINT_OK) {
    Serial.print("[ENROLL] StoreModel failed: 0x"); Serial.println(p, HEX);
    blinkLED(1, 0, 0, 3, 400);
    return;
  }

  Serial.print("[ENROLL] Fingerprint stored locally at ID #");
  Serial.println(newId);

  // === STEP 6: Notify the server ===
  bool saved = sendSavePrint(enrollMemberId, newId);

  if (saved) {
    Serial.println("[ENROLL] ✓ Enrollment complete!");
    buzzShort(1);
    blinkLED(0, 1, 0, 3, 400);  // Green blink 3x
  } else {
    Serial.println("[ENROLL] ✗ Server save failed!");
    // Delete from local sensor since server didn't confirm
    finger.deleteModel(newId);
    blinkLED(1, 0, 0, 3, 400);  // Red blink 3x
  }
}

// --- UNLOCK: Open door immediately (manager override) ---
void handleUnlock() {
  Serial.println("[UNLOCK] Remote unlock activated!");
  setLED(0, 1, 0);  // Green
  buzzShort(1);
  openDoor();
  setLED(0, 0, 0);
}

// --- LOCKED: Solid red, ignore sensor, just wait ---
void handleLocked() {
  setLED(1, 0, 0);  // Solid red
  // Do nothing — loop will poll check-mode and break out when mode changes
}

// ============================================================================
//  FINGERPRINT HELPERS
// ============================================================================

// Try to read and match a fingerprint against local database.
// Returns:
//   > 0  = matched fingerprint ID
//   0    = no finger detected (nothing on sensor)
//  -1    = finger detected but no match found
int scanFingerprint() {
  int p = finger.getImage();

  if (p == FINGERPRINT_NOFINGER) {
    return 0;  // No finger on sensor
  }

  if (p != FINGERPRINT_OK) {
    return 0;  // Imaging error, treat as no finger
  }

  // Finger detected — convert image
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    return -1;  // Conversion failed
  }

  // Search for match
  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.print("[SCAN] Match found! ID=");
    Serial.print(finger.fingerID);
    Serial.print("  Confidence=");
    Serial.println(finger.confidence);
    return finger.fingerID;
  }

  // No match
  return -1;
}

// Find the next empty slot in the sensor's local storage
int findNextAvailableSlot() {
  for (int i = 1; i < finger.capacity; i++) {
    int p = finger.loadModel(i);
    if (p == FINGERPRINT_PACKETRECIEVEERR) {
      // Slot is empty (no template stored)
      return i;
    }
    if (p != FINGERPRINT_OK) {
      // Also treat other errors as empty
      return i;
    }
  }
  return -1;  // Storage full
}

// ============================================================================
//  HARDWARE CONTROL HELPERS
// ============================================================================

// Set the RGB LED color (Common Cathode: HIGH = ON)
void setLED(bool red, bool green, bool blue) {
  digitalWrite(LED_RED_PIN,   red   ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN, green ? HIGH : LOW);
  digitalWrite(LED_BLUE_PIN,  blue  ? HIGH : LOW);
}

// Blink the LED a certain number of times
void blinkLED(bool red, bool green, bool blue, int times, int intervalMs) {
  for (int i = 0; i < times; i++) {
    setLED(red, green, blue);
    delay(intervalMs);
    setLED(0, 0, 0);
    delay(intervalMs);
  }
}

// Activate the relay to open the door
void openDoor() {
  Serial.println("[DOOR] Opening...");
  setRelay(true);
  delay(DOOR_OPEN_MS);
  setRelay(false);
  Serial.println("[DOOR] Closed.");
}

// Set relay state (true = door open, false = door closed)
void setRelay(bool open) {
  if (RELAY_ACTIVE_HIGH) {
    digitalWrite(RELAY_PIN, open ? HIGH : LOW);
  } else {
    digitalWrite(RELAY_PIN, open ? LOW : HIGH);
  }
}

// Short beep (~150ms)
void buzzShort(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(150);  // Gap between beeps
  }
}

// Long beep (~800ms)
void buzzLong(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(800);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(200);
  }
}

// ============================================================================
//  WI-FI HELPERS
// ============================================================================

void connectWiFi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    // Alternate red-blue while connecting
    setLED(attempts % 2, 0, !(attempts % 2));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WIFI] Connected! IP: ");
    Serial.println(WiFi.localIP());
    setLED(0, 1, 0);  // Green flash
    buzzShort(2);
    delay(500);
    setLED(0, 0, 0);
  } else {
    Serial.println();
    Serial.println("[WIFI] FAILED to connect!");
    setLED(1, 0, 0);  // Solid red
    delay(3000);
  }
}

void ensureWiFi() {
  unsigned long now = millis();
  if (now - lastWiFiCheck < WIFI_CHECK_INTERVAL) return;
  lastWiFiCheck = now;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Connection lost — reconnecting...");
    setLED(1, 1, 0);  // Yellow = reconnecting
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(500);
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("[WIFI] Reconnected! IP: ");
      Serial.println(WiFi.localIP());
      setLED(0, 0, 0);
    } else {
      Serial.println("[WIFI] Still disconnected. Will retry...");
      setLED(1, 1, 0);  // Stay yellow
    }
  }
}
