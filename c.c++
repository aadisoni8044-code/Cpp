#include <WiFi.h>


const char* ssid = "C++_ESP";
const char* password = "12345678";

WiFiServer server(80);
const int ledPin = 13; 

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  
  
  WiFi.softAP(ssid, password);
  server.begin();
  
  Serial.println("AP Started!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  WiFiClient client = server.available();
  if (client) {
    String request = client.readStringUntil('\r');
    
  
    if (request.indexOf("/ON") != -1) digitalWrite(ledPin, HIGH);
    if (request.indexOf("/OFF") != -1) digitalWrite(ledPin, LOW);
    
    
    client.println("HTTP/1.1 200 OK\nContent-type:text/html\n\n");
    client.println("<html><head><meta name='viewport' content='width=device-width, initial-scale=1'>");
    client.println("<style>button{background-color:#4CAF50; color:white; padding:20px; font-size:25px; border-radius:10px; width:100%;}</style></head>");
    client.println("<body style='text-align:center; font-family:sans-serif;'>");
    client.println("<h1>ESP32 LED Control</h1>");
    client.println("<p><a href='/ON'><button>TURN ON</button></a></p>");
    client.println("<p><a href='/OFF'><button style='background-color:#f44336;'>TURN OFF</button></a></p>");
    client.println("</body></html>");
    client.stop();
  }
}

// 192.168.4.1
