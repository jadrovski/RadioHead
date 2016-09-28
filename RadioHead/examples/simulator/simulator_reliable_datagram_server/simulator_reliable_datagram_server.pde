// simulator_reliable_datagram_server.pde
// -*- mode: C++ -*-
// Example sketch showing how to create a simple addressed, reliable messaging server
// with the RHReliableDatagram class, using the RH_SIMULATOR driver to control a SIMULATOR radio.
// It is designed to work with the other example simulator_reliable_datagram_client
// Tested on Linux
// Build with
// cd whatever/RadioHead 
// tools/simBuild examples/simulator/simulator_reliable_datagram_server/simulator_reliable_datagram_server.pde
// Run with ./simulator_reliable_datagram_server
// Make sure you also have the 'Luminiferous Ether' simulator tools/etherSimulator.pl running

#include <RHReliableDatagram.h>
#include <RH_TCP.h>

#define CLIENT_ADDRESS 1
#define SERVER_ADDRESS 2

// Singleton instance of the radio driver
RH_TCP driver;

// Class to manage message delivery and receipt, using the driver declared above
RHReliableDatagram manager(driver, SERVER_ADDRESS);

void setup() 
{
  Serial.begin(9600);
  driver.setCADTimeout(10);
  if (!manager.init())
    Serial.println("init failed");
  // Defaults after init are 434.0MHz, 0.05MHz AFC pull-in, modulation FSK_Rb2_4Fd36
    manager.setRetries(0); // Client will ping us if no ack received
//  manager.setTimeout(50);
}

uint8_t data[] = "And hello back to you";
// Dont put this on the stack:
uint8_t buf[RH_TCP_MAX_MESSAGE_LEN];

void loop()
{
  manager.available();
  manager.sendto(data, sizeof(data), CLIENT_ADDRESS);
  Serial.println("Sending message");
  delay(random(50, 200));
}

