
import mqtt from "mqtt";
const websocketUrl = "wss://129.169.48.175:9001";
const apiEndpoint = "<API-ENDPOINT>/";
function getClient(errorHandler) {
  const client = mqtt.connect(websocketUrl);
  client.stream.on("error", (err) => {
    errorHandler(`Connection to ${websocketUrl} failed`);
    client.end();
  });
  return client;
}

function subscribe(client, topic, errorHandler) {
  const callBack = (err, granted) => {
    if (err) {
      errorHandler("Subscription request failed");
    }
  };
  return console.log("connected")
}

function onMessage(client, callBack) {
  client.on("message", (topic, message, packet) => {
    callBack(JSON.parse(new TextDecoder("utf-8").decode(message)));
  });
}
function unsubscribe(client, topic) {
  client.unsubscribe(apiEndpoint + topic);
}
function closeConnection(client) {
  client.end();
}
const MQTTService = {
  getClient,
  subscribe,
  onMessage,
  unsubscribe,
  closeConnection,
};
export default MQTTService;