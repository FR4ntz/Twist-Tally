const int trigPin = 10;
const int echoPin = 9;

const float JARAK_KOSONG = 35.0;

float bacaJarak() {
  // Memastikan TRIG dalam keadaan LOW
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  // Mengirim sinyal ultrasonic selama 10 mikrodetik
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Membaca durasi pantulan
  unsigned long durasi = pulseIn(echoPin, HIGH, 30000UL);

  // Jika tidak menerima pantulan
  if (durasi == 0) {
    return -1;
  }

  // Menghitung jarak dalam cm
  float jarak = durasi * 0.0343 / 2;

  return jarak;
}

void setup() {
  Serial.begin(9600);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  Serial.println("Ultrasonic Sensor Started");
}

void loop() {
  float jarak = bacaJarak();

  if (jarak < 0) {
    Serial.println("Objek tidak terdeteksi");
  } else {
    Serial.print("Jarak: ");
    Serial.print(jarak);
    Serial.println(" cm");

    // Menghitung tinggi botol
    float tinggiBotol = JARAK_KOSONG - jarak;

    if (tinggiBotol < 0) {
      tinggiBotol = 0;
    }

    Serial.print("Tinggi botol: ");
    Serial.print(tinggiBotol);
    Serial.println(" cm");
  }

  delay(300);
}
