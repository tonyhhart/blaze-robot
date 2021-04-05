var balance = 50;
var previousCrashes = Array.prototype.slice
  .call($(".entries").children)
  .map(function (e) {
    return parseFloat(e.innerText);
  })
  .splice(0, 3);
var betHistory = [];
var STOP_WIN = 2;
var EXPONENT_PUSH_TOKEN;
var BET_PERCENTAGE = 0.01;
var interval;
function checkPreviousCrashes(data) {
  if (
    previousCrashes.every(function (crash) {
      return crash < 2;
    })
  ) {
    enterPosition(data);
  }
}
function updatePreviousCrashes(_a) {
  var _b = _a.payload,
    id = _b.id,
    crash_point = _b.crash_point;
  previousCrashes.splice(0, 1);
  previousCrashes.push(crash_point);
  if (betHistory[id]) {
    betHistory[id].crash_point = crash_point;
    if (crash_point > STOP_WIN) {
      betHistory[id].status = "win";
      balance += parseFloat((betHistory[id].amount * STOP_WIN).toFixed(2));
      BET_PERCENTAGE = 0.01;
    } else {
      betHistory[id].status = "loss";
      BET_PERCENTAGE *= 2;
    }
    var resultado =
      betHistory[id].status.toUpperCase() + ": Banca " + balance.toFixed(2);
    console.info(resultado);
    sendNotification("Resultado", resultado);
  }
}
function enterPosition(data) {
  var amount = parseFloat((balance * BET_PERCENTAGE).toFixed(2));
  balance = parseFloat((balance - amount).toFixed(2));
  betHistory[data.payload.id] = {
    balance: balance,
    amount: amount,
    status: "bet",
    created_at: new Date().toTimeString(),
  };
  console.info("ENTRADA DE R$", amount.toFixed(2));
}
function sendNotification(title, body) {
  if (EXPONENT_PUSH_TOKEN) {
    var xhr_1 = new XMLHttpRequest();
    xhr_1.open("POST", "https://exp.host/--/api/v2/push/send", true);
    xhr_1.setRequestHeader("Accept", "application/json");
    xhr_1.setRequestHeader("Content-Type", "application/json");
    xhr_1.onreadystatechange = function () {
      if (xhr_1.readyState === 4 && xhr_1.status === 200) {
        var json = JSON.parse(xhr_1.responseText);
        console.info(json);
      }
    };
    var data = JSON.stringify({
      body: body,
      title: title,
      to: EXPONENT_PUSH_TOKEN,
    });
    xhr_1.send(data);
  }
}
function startSocket() {
  var socket = new WebSocket(
    "wss://api-v2.blaze.com/replication/?EIO=3&transport=websocket"
  );
  var token = localStorage["ACCESS_TOKEN"];
  socket.onopen = function () {
    sendNotification("Blaze", "Conexão do socket aberta.");
    socket.send(
      "420" +
        JSON.stringify(["cmd", { id: "subscribe", payload: { room: "crash" } }])
    );
    socket.send(
      "421" +
        JSON.stringify([
          "cmd",
          { id: "authenticate", payload: { token: token } },
        ])
    );
    interval = setInterval(function () {
      return socket.send("2");
    }, 25 * 1000);
  };
  socket.onclose = function () {
    sendNotification("Blaze", "Conexão do socket encerrou.");
    clearInterval(interval);
    startSocket();
  };
  socket.onmessage = function (_a) {
    var dataString = _a.data;
    try {
      var data = JSON.parse(dataString.substr(10, dataString.length - 11));
      if (data.id === "crash.update") {
        if (data.payload.status === "waiting") {
          checkPreviousCrashes(data);
        }
        if (data.payload.status === "complete") {
          updatePreviousCrashes(data);
        }
      }
    } catch (e) {
      //
    }
  };
}
startSocket();
