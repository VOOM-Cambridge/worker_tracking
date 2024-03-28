import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';
import L from 'leaflet';
import { iconFacEnd, iconFacStart } from './icons';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import mqtt from 'mqtt';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

var options = {
  protocol: 'websockets',
  clientId: 'mapOutput', // This can be any unique id
};
var client = mqtt.connect('ws://129.169.48.175:9001', options);
client.subscribe('MQTTinReact');

client.on('connect', function () {
  console.log('Connected to MQTT broker');
});
const defaultPositionStart = [51.505, -0.09];
const defaultPositionEnd = [51.495, -0.09];
const defaultCurrent = [51.495, -0.10];
const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database('data/tracking.db');



function App() {
  const [positionStart, setPositionStart] = useState(defaultPositionStart);
  const [positionEnd, setPositionEnd] = useState(defaultPositionEnd);
  const [current, setCurrent] = useState(defaultCurrent);
  const [current2, setCurrent2] = useState(defaultCurrent);
  const [mesg, setMesg] = useState('');

//  const handleMessage = (topic, message) => {
//   console.log(message)
//       const note = message.toString();
//       setMesg(note);
//       console.log(note)

//       // Assuming the message is in the format "lat,lon"
//       //const [newLat, newLon] = note.split(',').map(parseFloat);

//       // Update the position based on the message
//       //setCurrent([newLat, newLon]);
//     };

  // db.all("SELECT * FROM TRACKING ORDER BY TIME_LAST_ACTION DESC LIMIT 5", (err, rows) => {
  //   if (err) {
  //     console.error(err.message);
  //   } 
  //   // Process rows
  // });
  const handleMessage = (data) => setCurrent(data);

  client.on('message', (topic, message) => {
    console.log(message)
    var data = JSON.parse(new TextDecoder("utf-8").decode(message))
    console.log(data)
    setMesg(data)
    //handleMessage(data)
    const newAr = [data.lat, data.lon]
    handleMessage(data)
    console.log(current)
   }); //handleMessage);

  //}, []); // Empty dependency array ensures the effect runs only once on mount

  return (
    <div>
      <MapContainer center={current} zoom={14} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={positionStart} icon={iconFacStart}>
          <Popup>Start position</Popup>
        </Marker>
        <Marker position={positionEnd} icon={iconFacEnd}>
          <Popup>End position</Popup>
        </Marker>
        <Marker position={current}>
          <Popup>Current position</Popup>
        </Marker>
      </MapContainer>
      Messeage reads: {mesg}
    </div>
  );
}

export default App;
