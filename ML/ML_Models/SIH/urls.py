from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path("speech_to_speech/", views.SpeechToSpeech.as_view(), name="speech_to_speech"),
    path("audio_extractor/", views.AudioExtracter.as_view(), name="audio_extractor"),
    path("merge_audio/", views.MergeAudio.as_view(), name="merge_audio")
    # path("text-summarizer/", views.TextSummarizer.as_view(), name="text_summarizer")
]
