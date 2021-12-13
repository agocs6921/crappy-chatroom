const express = require("express");
const fs = require("fs");
const { stdout } = require("process");
const io = require("socket.io")(3000, {
    cors: {
        origin: '*'
    }
});

const app = express();
const PORT = 80;

app.use("/static", express.static("static"));

app.set("view engine", "ejs");

const MSGFILENAME = "./data/messages.json";
const DATADIR = "./data";

var messages = [];
var messaging = {};

setInterval(() => {
    messaging = {};
}, 5000);

function addMessage(alias, message) {
    let to_send = JSON.stringify({alias, message}) + "\n"

    fs.access(DATADIR, err => {
        if (err) {
            fs.mkdir("./data", err => {
                if (err) {
                    console.log(err)
                }
            });
        }

        fs.appendFile(MSGFILENAME, to_send, err => {
            if (err) {
                fs.writeFileSync(MSGFILENAME, to_send);
                messages.push({alias, message});
            }
        });
    })
}

function loadMessages() {
    try {
        String(fs.readFileSync(MSGFILENAME)).split("\n").map(v => {
            if (v) {
                messages.push(JSON.parse(v));
            }
        })
    } catch(err) {
        stdout.write(`Ignore this error if '${MSGFILENAME}' is missing`)
        stdout.write(String(err) + "\n")
    }
}

io.on("connect", (socket) => {
    const address = ((ip) => {
        return ip.replace(/^:{2,}/g, "").split(":")[1]
    })(socket.handshake.address);

    stdout.write(`${address} connected as ${socket.id}\n`)

    const regex = /(^( |\t)+)|(( |\t)+$)/gm;

    socket.on("message", (alias, message) => {
        if (message.replace(regex, "") == "" || alias == null || messaging[address] > 15) return;

        filteredAlias = alias.replace(regex, "") == "" ? "Default Alias" : alias.substr(0, 32);
        filteredMessage = message.substr(0, 2000);

        addMessage(filteredAlias, filteredMessage);
    
        socket.broadcast.emit("message-received", filteredAlias, filteredMessage);

        if (messaging[address]) {
            messaging[address]++;
        } else {
            messaging[address] = 1;
        }
    })
})


app.get("/", (req, res) => {    
    res.render("index", { messages });
})

app.listen(PORT, () => {
    loadMessages();
    stdout.write("Ready.\n")
})