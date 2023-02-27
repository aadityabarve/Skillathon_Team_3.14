const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware');
const userRole = require('../isUser');
const request = require('request');
const sms = require('./sendSms');
const sendemailto = require('./sendemail');
const multer = require("multer");
const firebase = require('firebase');
const extractAudio = require('ffmpeg-extract-audio')
const { uploadBytesResumable, getDownloadURL } = require('firebase/storage');
require('firebase/storage');
global.XMLHttpRequest = require('xhr2');
var fs = require('fs');
const app = express();
const bodyParser = require('body-parser');

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));


const firebaseConfig = {
  apiKey: "AIzaSyCeArzn1SYMXs064Kf9LzMwXBYA2UrXnqs",
  authDomain: "skillathon-93d74.firebaseapp.com",
  projectId: "skillathon-93d74",
  storageBucket: "skillathon-93d74.appspot.com",
  messagingSenderId: "557774966085",
  appId: "1:557774966085:web:ea43072771061aef84422c",
  measurementId: "G-ZZY1Y3ZLJQ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const upload = multer({storage: multer.memoryStorage()});

var id="";

async function checkUserPresent(email, password) {
  console.log("Hello");
  console.log(email);
  console.log(password);
  var data=null;
  await db.collection("Users").where("email", "==", email).where("password", "==", password).get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      // console.log(doc.data());
      if(doc.data() == null)
        data = null;
      else{
        data = { ...doc.data(), id: doc.id };
      }
    });
  })
  if(data == null)
      return false;
  id = data.id;
  return true;
}

//insert Json
function insertItem(json, collection, doc) {
  if (doc == null) {
    db.collection(collection).add(json)
      .then(ref => {
        console.log('Added document with ID: ', ref.id);
      }).catch(err => {
        console.log('Error adding document: ', err);
      });
  } else {
    db.collection(collection).doc(doc).set(json)
      .then(ref => {
        console.log('Added document with ID: ', ref.id);
      }).catch(err => {
        console.log('Error adding document: ', err);
      });
  }
}

router.get('/Dashboard', async (req, res) => {
  console.log(id);
  var userinfo;
  var notifications = [];
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });

  var course_data = [];
  await db.collection("Courses").where("user_id", "==", id).get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      // console.log(doc.data());
      var data = { ...doc.data(), id: doc.id };
      course_data.push(data);
    });
  })

  var total_courses = course_data.length;
  var enrollments = 0;
  var graph_data = [];
  for(var i=0;i<course_data.length;i++){
    enrollments = enrollments + course_data[i].enrolled_users;
    var data = { value: course_data[i].enrolled_users, name: course_data[i].name };
    graph_data.push(data);
  }
  var enrollments_per_course = 0;
  if(total_courses != 0){
    enrollments_per_course = enrollments/total_courses;
  }

  // console.log(graph_data);

  res.render('user/dashboard', {
    userData: userinfo, course_data: course_data,
    total_courses: total_courses, enrollments: enrollments,
    enrollments_per_course: enrollments_per_course, graph_data: graph_data
  });

})

router.post("/search", async (req,res) => {
  const query = req.body.query;
  const courses = [];
  await db.collection("Courses").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const keywords = doc.data().keywords;
      var flag=0;
      for(var i=0;i<keywords.length;i++){
        if(keywords[i] == query)
        {
          flag=1;
          break;
        }
      }
      if(flag)
        courses.push({...doc.data(), id: doc.id});
    })
  })
  console.log(courses);

  return res.status(200).json({courses: courses});
})

router.post('/select', async (req,res) => {
  const course_id = req.body.course_id;
  const course = null;
  await db.collection("Courses").doc(course_id).get().then((doc) => {
    course = {...doc.data(), id: doc.id};
  })
  return res.status(200).json({courses: courses});
})

router.post('/confirm', async (req,res) => {
  const course_id = req.body.course_id;
  let enrollments = 0, course = null;
  await db.collection("Courses").doc(course_id).get().then((doc) => {
    course = {...doc.data(), id: doc.id};
  })
  enrollments = course.enrolled_users + 1;

  await db.collection("Courses").doc(course_id).update({enrolled_users: enrollments});
  return res.status(200).json({"message": "Success"});

})

router.post('/cancel', async (req,res) => {
  const course_id = req.body.cou;
  let enrollments = 0, course = null;
  await db.collection("Courses").doc(course_id).get().then((doc) => {
    course = {...doc.data(), id: doc.id};
  })
  enrollments = course.enrolled_users - 1;

  await db.collection("Courses").doc(course_id).update({enrolled_users: enrollments});
  return res.status(200).json({"message": "Success"});
})

router.get('/TextToSpeech', async (req,res) => {
  var userinfo;
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });
  res.render('user/text_to_speech', {userData: userinfo});
})

router.get('/ContentGPT', async (req,res) => {
  var userinfo;
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });
  const question = "What is Python Programming ?";
  const response = "Python is a high-level, interpreted, general-purpose programming language. It is an open source scripting language with easy to understand syntax and powerful libraries for data manipulation and analysis. Python can be used for web development, software development, mathematics, system scripting, and much more. Python is known for its readability and simple syntax which makes it easy to learn and use."
  res.render('user/ContentGPT', { userData: userinfo, question: question, response: response });
})

router.post('/GenerateResponse', async (req,res) => {
  console.log(req.body);
  const question = req.body.question;
  var response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: question,
    max_tokens: 1000
  });
  response = response.data.choices[0].text;
  console.log(response);
  var userinfo;
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });
  res.render('user/ContentGPT', { userData: userinfo, question: question, response: response });
})

router.get('/VideoGeneration', async (req,res) => {
  var userinfo;
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });
  res.render('user/video_generation', { userData: userinfo });
})

router.get('/UploadVideo', async (req,res) => {
  var userinfo;
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });
  res.render('user/uploadVideo', { userData: userinfo });
})

router.post('/UploadVideo', upload.fields([{ name: 'video_name'}, { name: 'video_thumbnail' }]), async (req,res) => {
  const storageRef = storage.ref(req.files.video_name[0].originalname);
  await storageRef.put(req.files.video_name[0].buffer, {
    contentType: req.files.video_name[0].mimetype
  })
  const video_url = await storageRef.getDownloadURL() // after upload, obtain the download URL
  console.log(video_url);

  const thumbnailRef = storage.ref(req.files.video_thumbnail[0].originalname);
  await thumbnailRef.put(req.files.video_thumbnail[0].buffer, {
    contentType: req.files.video_thumbnail[0].mimetype
  })
  const thumbnail_url = await thumbnailRef.getDownloadURL() // after upload, obtain the download URL
  console.log(thumbnail_url);
  const course_name = req.body.course_name;
  const course_keywords = req.body.course_keywords.split(', ');
  const course_description = req.body.course_description;

  const body = { enrolled_users: 0, name: course_name, keywords: course_keywords, thumbnail: thumbnail_url, video_url: video_url, user_id: id, description: course_description };
  insertItem(body, "Courses");
  res.redirect('/Dashboard');
})

router.get('/VideoTranslation', async (req,res) => {
  var userinfo;
  await db.collection("Users").doc(id).get().then((doc) => {
    console.log(doc.data());
    userinfo = doc.data();
  });
  res.render('user/video_translation', { userData: userinfo });
})

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 

router.post('/VideoTranslation', upload.single('video_name'), async (req,res) => {
  console.log(req.file);
  const storageRef = storage.ref(req.file.originalname);
  await storageRef.put(req.file.buffer, {
    contentType: req.file.mimetype
  })
  const video_url = await storageRef.getDownloadURL()
  console.log(video_url);
  await extractAudio({
    input: video_url,
    output: 'test.wav'
  })
  var buffer = await fs.readFileSync('test.wav');
  const audioRef = storage.ref('test'+Date.now()+'.wav');
  await audioRef.put(buffer, {
    contentType: 'audio/x-wav',
  })
  const audio_url = await audioRef.getDownloadURL();
  console.log(req.body);

  console.log(audio_url);
  const runRequestBody = {
      audio_url: audio_url,
      reference_language: req.body.ref_language,
      target_language: req.body.tar_language
  };

  request.post({
      url: "http://127.0.0.1:8000/speech_to_speech/",
      json: runRequestBody
  },
  async function(error, response, body){
    const name = "converted_audio_NMT"+Date.now()+".mp3";
    console.log(body);
    fs.writeFile(name, body, async function (err) {
      console.log("The file was saved!");
      // const targetAudioRef = storage.ref('target'+Date.now()+'.mp3');
      // var buffer = fs.readFileSync(name);
      // await targetAudioRef.put(buffer, {
      //     contentType: 'audio/mp3'
      // })
      // const target_audio_url = await targetAudioRef.getDownloadURL();
      // console.log(target_audio_url)
    });
  });

  // await delay(20000);

})

module.exports = {
  router: router,
  insertItem: insertItem,
  checkUserPresent: checkUserPresent,
  id: id
};
