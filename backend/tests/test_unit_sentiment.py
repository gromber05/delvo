from __future__ import annotations

import pytest

from app.api.v1.endpoints.assistant.chat_endpoint import _classify_sentiment


class TestClassifySentimentPositive:
    def test_gracias_is_positive(self):
        assert _classify_sentiment("Gracias por tu ayuda") == "positive"

    def test_perfecto_is_positive(self):
        assert _classify_sentiment("Perfecto, justo lo que necesitaba") == "positive"

    def test_genial_is_positive(self):
        assert _classify_sentiment("¡Genial! Funciona de maravilla") == "positive"

    def test_excelente_is_positive(self):
        assert _classify_sentiment("Excelente trabajo") == "positive"

    def test_great_is_positive(self):
        assert _classify_sentiment("This is great!") == "positive"

    def test_thanks_is_positive(self):
        assert _classify_sentiment("Thanks a lot!") == "positive"

    def test_awesome_is_positive(self):
        assert _classify_sentiment("Awesome app, I love it") == "positive"

    def test_fantastico_is_positive(self):
        assert _classify_sentiment("¡Fantástico! Todo perfecto") == "positive"

    def test_helpful_is_positive(self):
        assert _classify_sentiment("Very helpful assistant") == "positive"

    def test_multiple_positive_words(self):
        """Varios positivos siguen siendo positive."""
        result = _classify_sentiment("Gracias, genial, perfecto, excelente")
        assert result == "positive"


class TestClassifySentimentNegative:
    def test_error_is_negative(self):
        assert _classify_sentiment("Hay un error en la aplicación") == "negative"

    def test_problema_is_negative(self):
        assert _classify_sentiment("Tengo un problema con la tarea") == "negative"

    def test_fallo_is_negative(self):
        assert _classify_sentiment("Hay un fallo grave") == "negative"

    def test_broken_is_negative(self):
        assert _classify_sentiment("The app is broken") == "negative"

    def test_terrible_is_negative(self):
        assert _classify_sentiment("Terrible experience") == "negative"

    def test_lento_is_negative(self):
        assert _classify_sentiment("El sistema está muy lento") == "negative"

    def test_crash_is_negative(self):
        assert _classify_sentiment("The app had a crash") == "negative"

    def test_not_working_is_negative(self):
        assert _classify_sentiment("This is not working at all") == "negative"

    def test_multiple_negative_words(self):
        result = _classify_sentiment("error, problema, fallo, terrible")
        assert result == "negative"


class TestClassifySentimentNeutral:
    def test_empty_string_is_neutral(self):
        assert _classify_sentiment("") == "neutral"

    def test_neutral_text(self):
        assert _classify_sentiment("¿Cuáles son mis tareas de hoy?") == "neutral"

    def test_plain_question_is_neutral(self):
        assert _classify_sentiment("Crea un evento el lunes a las 10") == "neutral"

    def test_equal_pos_neg_is_neutral(self):
        """Si hay igual número de positivos y negativos → neutral."""
        result = _classify_sentiment("gracias pero hay un error")
        assert result == "neutral"

    def test_numbers_only_are_neutral(self):
        assert _classify_sentiment("1234567890") == "neutral"

    def test_case_insensitive_positive(self):
        """La detección debe ser case-insensitive."""
        assert _classify_sentiment("GRACIAS") == "positive"

    def test_case_insensitive_negative(self):
        assert _classify_sentiment("ERROR CRITICO") == "negative"
