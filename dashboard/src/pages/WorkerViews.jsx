
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Container, Form, Card, Col, Row, Button } from 'react-bootstrap'
import './index.css';
import mqtt from 'mqtt';

const WorkerView = ({ config }) => {
  const [data, setData] = useState([]);
  const mqttClientRef = useRef(null); // Create a ref to store the MQTT client instance

  let url = window.location.hostname;

  const backendAll = "http://" + url + ":" + config.sqlite3.port + "/workerAll"
  const backendUpdate = "http://" + url + ":" + config.sqlite3.port + "/update"
  const backendWorker = "http://" + url + ":" + config.sqlite3.port + "/worker"
  const wsaddress = 'ws://' + url + ":" + config.service_layer.port

  // Use a ref to maintain MQTT client across renders

  useEffect(() => {
    // Initialize MQTT client only once
    mqttConnect();
  }, []); // Empty dependency array ensures the effect runs only once

  const mqttConnect = () => {
    console.log("Mqtt clinet is ...")

    if (!mqttClientRef.current) {
      mqttClientRef.current = mqtt.connect(wsaddress);
      mqttClientRef.current.on('connect', () => {
        console.log('Connected to MQTT Broker');
      });

      mqttClientRef.current.on('error', (err) => {
        console.error('Connection error:', err);
      });
    }
    console.log(mqttClientRef)
    // Clean up on unmount
    return () => {
      // if (mqttClientRef.current) {
      //   mqttClientRef.current.end();
      //   mqttClientRef.current = null;
      // }
    };

  }
  // const reconnectMqtt = () => {
  //   client = mqtt.connect(wsaddress)
  // };

  const sendMessage = (message) => {
    //sendJsonMessage(topic, message);
    mqttConnect();
    mqttClientRef.current.publish((config.service_layer.topic + config.location + "/"), message);
    //client.publish((config.service_layer.topic + config.location + "/"), message);
    console.log('Message sent:', message);
  };

  const fetchDate = async () => {
    const resE = await axios.get(backendAll)
    if (resE.data != null) {
      setData(resE.data)
      console.log(resE.data)
    }
  }

  useEffect(() => {
    fetchDate()
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // This code block will be executed every 10 seconds
      //console.log('This is executed every 5 seconds');
      fetchDate();
    }, 2000); // 10000 milliseconds = 10 seconds

    // Clean up the interval when the component is unmounted
    return () => clearInterval(interval);

  }, []);

  const getColor = (status) => {
    if (status == "Log out") {
      return "bg-danger" + " p-3"
    } else if (status == "Log in") {
      return "bg-success " + " p-3"
    }
  };

  const getText = (status) => {
    if (status == "Log out") {
      return "Logged Out"
    } else if (status == "Log in") {
      return "Logged In"
    }
  };

  const getDate = (date) => {
    console.log(date)
    const dateNew = new Date(date)
    const year = dateNew.getFullYear();
    const month = String(dateNew.getMonth() + 1).padStart(2, '0');
    const day = String(dateNew.getDate()).padStart(2, '0');
    const time = String(dateNew.toLocaleTimeString())

    const formattedDate = time + " - " + day + "-" + month + "-" + year
    return formattedDate;
  };



  const setLogText = (status) => {
    if (status == "Log out") {
      return "Log In"
    } else if (status == "Log in") {
      return "Log Out"
    }
  };

  const updateValue = async (id, time_last, status, time_worked) => {
    let timeWork = time_worked
    let statusNew = ""
    const dateNew = new Date();
    if (status == "Log in") {
      const dateOld = new Date(time_last);
      timeWork = Math.round(time_worked + (dateNew.getTime() - dateOld.getTime()) / 1000);
      statusNew = "Log out"
    } else {
      timeWork = time_worked;
      statusNew = "Log in"
    }

    const values = {
      "id": id,
      "status": statusNew,
      "timeWorked": timeWork,
    }
    await axios.post(backendUpdate, values)
    //const formattedDate =format(dateNew, 'yyyy-MM-dd HH:mm:ss');
    const valuesMQTT = {
      "location": config.location,
      "id": id,
      "state": statusNew,
      "name": config.location,
      "timeWorked": timeWork,
      "timestamp": dateNew,

    }
    sendMessage(JSON.stringify(valuesMQTT))
    fetchDate()
  }

  return (
    <div>
      <div><Container fluid="md">
        <Card key="main" className='mt-2 text-center'>
          <Card.Header as="h1" >Worker Activity View</Card.Header>
          <Card.Body>
            <Row>
              <Col><Card.Title className="text-center h2">Workers ID numebr</Card.Title></Col>
              <Col><Card.Title className="text-center h2">Status </Card.Title></Col>
              <Col><Card.Title className="text-center h2">Last action time </Card.Title></Col>
              <Col></Col>
            </Row>
            {data.map((result, index) => (
              <Row>
                <Col>

                  <Card className="p-3"><Card.Text className="text-center h5">{result.IDNUM}</Card.Text></Card>
                </Col>
                <Col>
                  <Card text='light' className={getColor(result.STATUS)}><Card.Text className="text-center h5">{getText(result.STATUS)}</Card.Text></Card>
                </Col>
                <Col>
                  <Card className="p-3"><Card.Text className="text-center h5">{getDate(result.TIME_LAST_ACTION)}</Card.Text></Card>
                </Col>
                <Col>
                  <Button key={index} text='light' className="p-3" onClick={() => updateValue(result.IDNUM, result.TIME_LAST_ACTION, result.STATUS, result.TIME_WORKED)}>{setLogText(result.STATUS)}</Button>

                </Col>
              </Row>
            ))}
          </Card.Body>
        </Card>
      </Container>
      </div>
    </div>
  );
};
export default WorkerView;