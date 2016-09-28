// simulator_reliable_datagram_client.pde
// -*- mode: C++ -*-
// Example sketch showing how to create a simple addressed, reliable messaging client
// with the RHReliableDatagram class, using the RH_SIMULATOR driver to control a SIMULATOR radio.
// It is designed to work with the other example simulator_reliable_datagram_server
// Tested on Linux
// Build with
// cd whatever/RadioHead 
// tools/simBuild examples/simulator/simulator_reliable_datagram_client/simulator_reliable_datagram_client.pde
// Run with ./simulator_reliable_datagram_client
// Make sure you also have the 'Luminiferous Ether' simulator tools/etherSimulator.pl running

#include <RHReliableDatagram.h>
#include <RH_TCP.h>

// Singleton instance of the radio driver
RH_TCP driver;

// Class to manage message delivery and receipt, using the driver declared above
RHReliableDatagram manager(driver, 255);

void setup() 
{
  Serial.begin(9600);
  driver.setCADTimeout(10);
  // Maybe set this address from teh command line
  if (_simulator_argc >= 2)
     manager.setThisAddress(atoi(_simulator_argv[1]));
  if (!manager.init())
    Serial.println("init failed");
  // Defaults after init are 434.0MHz, 0.05MHz AFC pull-in, modulation FSK_Rb2_4Fd36
}

uint8_t data[] = "Hello World!";
// Dont put this on the stack:
uint8_t buf[RH_TCP_MAX_MESSAGE_LEN];

void loop()
{
  uint8_t len = sizeof(buf);
  uint8_t from;
  if(manager.recvfrom(buf, &len, &from)) {
	  Serial.print(">>> RECEIVED: ");
	  Serial.print((char*)buf);
	  Serial.print(", FROM: ");
	  Serial.print(from, HEX);
	  Serial.print("\n");
  }
  manager.sendto(data, sizeof(data), 255);
  Serial.println("Sending message");
}

