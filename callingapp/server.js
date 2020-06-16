var express = require('express');
var app = express();
var open = require('open');
var serverPort = (80);
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);

const peerConnections = {};

const config = { iceServers: [{ url: 'stun:stun.l.google.com:19302' }] };
 
// Media contrains
const constraints = {
  video: { facingMode: "user" }
  // Uncomment to enable audio
  // au
};

var sockets = {};
var users = {};
function sendTo(connection, message) {
   connection.send(message);
}
 
app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
});
 
io.on('connection', function(socket){
  console.log("user connected");
 
  socket.on('disconnect', function () {
    console.log("user disconnected");
    if(socket.name){
      socket.broadcast.to("chatroom").emit('roommessage',{ type: "disconnect", username: socket.name})
      delete sockets[socket.name];
      delete users[socket.name];
    }
 
  })
 
  socket.on('message', function(message){
 
    var data = message;
 
    switch (data.type) {
 
    case "login":
      console.log("User logged", data.name);
 
      //if anyone is logged in with this username then refuse
      if(sockets[data.name]) {
         sendTo(socket, {
            type: "login",
            success: false
         });
      } else {
         //save user connection on the server
         var templist = users;
         sockets[data.name] = socket;
         socket.name = data.name;
         sendTo(socket, {
            type: "login",
            success: true,
            username: data.name,
            userlist: templist
         });
         socket.broadcast.to("chatroom").emit('roommessage',{ type: "login", username: data.name})
         socket.join("chatroom");
         users[data.name] = socket.id
      }
 
      break;
      case "video_offer":
        console.log('caller sdp',data.sdp);
        if(sockets[data.name]){
          console.log("user called");
          console.log(data.name);
          console.log(data.sdp);
          sendTo(sockets[data.name], {
            type: "handleVideoOffer",
            callername: data.callername,
            sdp: data.sdp
          }); 
      }else{
        sendTo(socket, {
           type: "call_response",
           response: "offline"
        });
      }
      break;
      case "video-answer":
        console.log(data.sdp)
        sendTo(sockets[data.callername], {
         type: "handleVideoAnswer",
         response: "accepted",
         responsefrom : data.from,
         sdp: data.sdp
        }); 
      break;
      case "call_rejected":
      sendTo(sockets[data.callername], {
         type: "call_response",
         response: "rejected",
         responsefrom : data.from
      });
      break;
      case "new-ice-candidate":
        console.log("Sending candidate to:",data.target); 
        var conn = sockets[data.target]; 
        if(conn != null) {
           sendTo(conn, { 
              type: "handlecandidate", 
              candidate: data.candidate ,
              target: data.target
           }); 
        }
       
        break;
       break;
      case "call_busy":
      sendTo(sockets[data.callername], {
         type: "call_response",
         response: "busy",
         responsefrom : data.from
      });
      break;
      default:
      sendTo(socket, {
         type: "error",
         message: "Command not found: " + data.type
      });
      break;
}
 
  })
})
 
server.listen(serverPort, function(){
   console.log('server up and running at %s port', serverPort);
 });


 