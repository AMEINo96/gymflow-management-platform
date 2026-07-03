# GymFlow ESP32 Firmware

Complete Arduino IDE sketch for the GymFlow biometric attendance system.

## Quick Start

1. Open `GymFlow_ESP32.ino` in Arduino IDE
2. Edit the **3 configuration values** at the top of the file:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* SERVER_URL    = "http://192.168.1.100:3000";
   ```
3. Install the required libraries (see below)
4. Select board: **ESP32 Dev Module**
5. Upload!

## Required Libraries

Install these via **Arduino IDE → Sketch → Include Library → Manage Libraries**:

| Library | Author | Version |
|---------|--------|---------|
| ArduinoJson | Benoit Blanchon | 7.x |
| Adafruit Fingerprint Sensor Library | Adafruit | Latest |

**Built-in** (no install needed): `WiFi.h`, `HTTPClient.h`

## Wiring Diagram

```
COMPONENT              ESP32 PIN
────────────────────────────────────

Fingerprint Sensor (R307/R503)
  VCC (Red)        →   3.3V
  GND (Black)      →   GND
  TX  (Yellow)     →   GPIO 16 (RX2)
  RX  (Green)      →   GPIO 17 (TX2)

RGB LED (Common Cathode)
  Red              →   GPIO 26
  Green            →   GPIO 25
  Blue             →   GPIO 33
  Common (GND)     →   GND

Active Buzzer
  (+)              →   GPIO 32
  (-)              →   GND

5V Relay Module
  VCC              →   VIN (5V)
  GND              →   GND
  IN               →   GPIO 27
```

> **Relay Type:** If your relay activates on LOW instead of HIGH,
> change `RELAY_ACTIVE_HIGH` to `false` at the top of the sketch.

## LED Color Meanings

| Color | Meaning |
|-------|---------|
| 🟢 Green | Access granted / Enrollment success |
| 🔴 Red | Access denied / Error / Gym locked |
| 🔵 Blue | Enrollment mode (waiting for finger) |
| 🟡 Yellow | Connecting to WiFi / Server error |
| 🩵 Cyan | Remove finger (during enrollment) |

## Buzzer Patterns

| Pattern | Meaning |
|---------|---------|
| 1 short beep | Access granted |
| 1 long beep | Access denied |
| 2 short beeps | Unknown fingerprint |
| 2 short beeps | WiFi connected |

## Troubleshooting

- **Red rapid blink on startup** → Fingerprint sensor not detected. Check wiring.
- **Yellow LED stays on** → WiFi disconnected or server unreachable.
- **No response after scan** → Check `SERVER_URL` is correct and server is running.
- **Relay clicks but door doesn't open** → Try toggling `RELAY_ACTIVE_HIGH`.
