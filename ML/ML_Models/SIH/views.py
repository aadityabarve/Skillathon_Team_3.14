from django.shortcuts import render
from django.views import View
from django.http import HttpResponse, JsonResponse
from rest_framework.parsers import JSONParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse, HttpResponse, FileResponse
from django.conf import settings
import io
import os
import speech_recognition as sr
from gtts import gTTS
from deep_translator import GoogleTranslator
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
import moviepy.editor
import wget
import requests
from pydub import AudioSegment
# import dill
# import nltk

# @method_decorator(csrf_exempt, name='dispatch')
# class TextSummarizer(View):
#     def post(self, request, *args, **kwargs):
#         json_data = request.body
#         stream = io.BytesIO(json_data)
#         pythondata = JSONParser().parse(stream)
#         text = pythondata.get('text', None)
#         with open(os.path.join(settings.BASE_DIR, 'ml_models/tokenizer_text_summarizer'), 'rb') as f:
#             tokenizer = dill.load(f)
#         with open(os.path.join(settings.BASE_DIR, 'ml_models/model_text_summarizer'), 'rb') as f:
#             model = dill.load(f)
#         inputs = tokenizer([text], return_tensors='pt')
#         words = len(text.split())
#         summary_ids = model.generate(inputs['input_ids'], early_stopping=False)
#         summary = [tokenizer.decode(g, skip_special_tokens=True) for g in summary_ids]
#         return JsonResponse({'extracted_text': summary[0]})

# @method_decorator(csrf_exempt, name='dispatch')
# class ArticleSummarizer(View):
#     def post(self, request, *args, **kwargs):
#         json_data = request.body
#         stream = io.BytesIO(json_data)
#         pythondata = JSONParser().parse(stream)
#         text = pythondata.get('text', None)
#         article = Article(text)
#         article.download()
#         article.parse()
#         nltk.download('punkt')
#         article.nlp()
#         return JsonResponse({'extracted_text': article.summary})

@method_decorator(csrf_exempt, name='dispatch')
class SpeechToSpeech(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        r = sr.Recognizer()
        ref_speech = pythondata.get('audio_url', None)
        ref_lang = pythondata.get('reference_language',None)
        doc = requests.get(ref_speech)
        with open('source_speech.wav', 'wb') as f:
            f.write(doc.content)
            audio_file = sr.AudioFile("source_speech.wav")
            print(type(audio_file))
            with audio_file as source:
                audio_file = r.record(source, duration = 30.0)
                result = r.recognize_google(audio_data=audio_file)
        ref_text = result
        print(ref_text)
        target_lang = pythondata.get('target_language',None)
        target_text = GoogleTranslator(source='auto', target= target_lang).translate(ref_text)
        print(target_text)
        tts = gTTS(target_text, lang=target_lang)
        # Save converted audio as mp3 format
        tts.save('converted_audio_NMT.mp3')
        fname="converted_audio_NMT.mp3"
        f = open(fname,"rb")
        response = HttpResponse()
        response.write(f.read())
        response['Content-Type'] ='audio/mp3'
        response['Content-Length'] =os.path.getsize(fname )
        return response

@method_decorator(csrf_exempt, name='dispatch')
class TextToSpeech(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        course_transcript = pythondata.get('trascript',None)
        course_transcript_lang = pythondata.get('transcript_lang',None)
        tts = gTTS(course_transcript, lang=course_transcript_lang)
        # Save converted audio as mp3 format
        tts.save('converted_TTS.mp3')

@method_decorator(csrf_exempt, name='dispatch')
class SpeechToText(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        r = sr.Recognizer()
        course_audio = pythondata.get('course_audio_url', None)
        course_lang = pythondata.get('course_audio_lang', None)
        with sr.AudioFile(course_audio) as source:
            audio_text = r.listen(source)
        # recoginize_() method will throw a request error if the API is unreachable, hence using exception handling
            try:
                # using google speech recognition
                course_text = r.recognize_google(audio_text, language=course_lang)     
            except:
                print('Sorry.. run again...')
        # Result present in course_text variable

@method_decorator(csrf_exempt, name='dispatch')
class TextTranslation(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        course_original_text = pythondata.get('course_transcript',None)
        target_course_lang = pythondata.get('course_target_text_lang',None)
        translated_course_text = GoogleTranslator(source='auto', target= target_course_lang).translate(course_original_text)

@method_decorator(csrf_exempt, name='dispatch')
class TextSummarizer(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        course_transcript = pythondata.get('course_trancript_text',None)
        stopWords = set(stopwords.words("english"))
        words = word_tokenize(course_transcript)

        # Creating a frequency table to keep the
        # score of each word

        freqTable = dict()
        for word in words:
            word = word.lower()
            if word in stopWords:
                continue
            if word in freqTable:
                freqTable[word] += 1
            else:
                freqTable[word] = 1

        # Creating a dictionary to keep the score
        # of each sentence
        sentences = sent_tokenize(course_transcript)
        sentenceValue = dict()

        for sentence in sentences:
            for word, freq in freqTable.items():
                if word in sentence.lower():
                    if sentence in sentenceValue:
                        sentenceValue[sentence] += freq
                    else:
                        sentenceValue[sentence] = freq

        sumValues = 0
        for sentence in sentenceValue:
            sumValues += sentenceValue[sentence]

        # Average value of a sentence from the original text

        average = int(sumValues / len(sentenceValue))

        # Storing sentences into our summary.
        summary = ''
        for sentence in sentences:
            if (sentence in sentenceValue) and (sentenceValue[sentence] > (1.2 * average)):
                summary += " " + sentence
        return summary

@method_decorator(csrf_exempt, name='dispatch')
class AudioExtracter(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        video_url = pythondata.get('video_firebase_url', None)
        print(video_url)
        video = moviepy.editor.VideoFileClip(video_url)
        video.audio.write_audiofile("Extracted_Audio.wav") #change code here
        fname="Eextracted_Audio.wav"
        f = open(fname,"rb") 
        response = HttpResponse()
        response.write(f.read())
        response['Content-Type'] ='audio/mp3'
        response['Content-Length'] =os.path.getsize(fname)
        return response

@method_decorator(csrf_exempt, name='dispatch')
class MergeAudio(View):
    def post(self, request):
        json_data = request.body
        stream = io.BytesIO(json_data)
        pythondata = JSONParser().parse(stream)
        ref_audio = pythondata.get('target_audio',None)
        doc = requests.get(ref_audio)
        with open('source_speech.mp3', 'wb') as f:
            f.write(doc.content)
        video_url = pythondata.get('video_firebase_url', None)
        audio = moviepy.editor.AudioFileClip("source_speech.mp3")
        video = moviepy.editor.VideoFileClip(video_url)
        final_video = video.set_audio(audio)
        final_video.write_videofile("Merged_Video.mp4") #change code here
        fname = "Merged_Video.mp4"
        f = open(fname,"rb") 
        response = HttpResponse()
        response.write(f.read())
        response['Content-Type'] ='audio/mp4'
        response['Content-Length'] =os.path.getsize(fname)
        return response

