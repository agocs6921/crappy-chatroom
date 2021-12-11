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
    stdout.write(`${socket.id} connected\n`)

    socket.on("message", (alias, message) => {
        addMessage(alias, message);
    
        socket.broadcast.emit("message-received", alias, message);
    })
})


app.get("/", (req, res) => {    
    res.render("index", { messages });
})

app.listen(PORT, () => {
    loadMessages();
    stdout.write("Ready.\n")
})