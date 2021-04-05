let balance = 87.1;
const previousCrashes = Array.prototype.slice
  .call($(".entries").children)
  .map((e) => parseFloat(e.innerText))
  .splice(0, 3);
const betHistory: BetHistory[] = [];
const STOP_WIN = 2;
let EXPONENT_PUSH_TOKEN: string;
let BET_PERCENTAGE = 0.01;
let interval: number;

function checkPreviousCrashes(data: CrashUpdate) {
  if (previousCrashes.every((crash) => crash < 2)) {
    enterPosition(data);
  }
}

function updatePreviousCrashes({ payload: { id, crash_point } }: CrashUpdate) {
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
    const resultado = `${betHistory[
      id
    ].status.toUpperCase()}: Banca ${balance.toFixed(2)}`;

    console.info(resultado);

    sendNotification("Resultado", resultado);
  }
}

function enterPosition(data: CrashUpdate) {
  const amount = parseFloat((balance * BET_PERCENTAGE).toFixed(2));
  balance = parseFloat((balance - amount).toFixed(2));

  betHistory[data.payload.id] = {
    balance,
    amount,
    status: "bet",
    created_at: new Date().toTimeString(),
  };

  console.info("ENTRADA DE R$", amount.toFixed(2));
}

function sendNotification(title: string, body: string) {
  if (EXPONENT_PUSH_TOKEN) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://exp.host/--/api/v2/push/send", true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const json = JSON.parse(xhr.responseText);
        console.info(json);
      }
    };
    const data = JSON.stringify({
      body,
      title,
      to: EXPONENT_PUSH_TOKEN,
    });
    xhr.send(data);
  }
}

type CrashUpdate = {
  id: "crash.update";
  payload: {
    id: number;
    x: number;
    y: number;
    created_at: string;
    updated_at: string;
    status: "waiting" | "graphing" | "complete";
    crash_point: number;
  };
};

type BetHistory = {
  balance: number;
  amount: number;
  crash_point?: number;
  status: "bet" | "win" | "loss";
  created_at: string;
};

function startSocket() {
  const socket = new WebSocket(
    "wss://api-v2.blaze.com/replication/?EIO=3&transport=websocket"
  );
  const token = localStorage["ACCESS_TOKEN"];

  socket.onopen = () => {
    sendNotification("Blaze", "Conexão do socket aberta.");

    socket.send(
      "420" +
        JSON.stringify(["cmd", { id: "subscribe", payload: { room: "crash" } }])
    );

    socket.send(
      "421" +
        JSON.stringify(["cmd", { id: "authenticate", payload: { token } }])
    );

    interval = setInterval(() => socket.send("2"), 25 * 1000);
  };

  socket.onclose = () => {
    sendNotification("Blaze", "Conexão do socket encerrou.");
    clearInterval(interval);
    startSocket();
  };

  socket.onmessage = ({ data: dataString }) => {
    try {
      const data: CrashUpdate = JSON.parse(
        dataString.substr(10, dataString.length - 11)
      );
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
