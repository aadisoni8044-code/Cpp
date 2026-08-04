import os
import sys
import pytest
from unittest.mock import MagicMock, patch

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QLineEdit, QPushButton, QTextBrowser, QPlainTextEdit, QApplication

import ms_ai_app
from ms_ai_app import MSAICopilotApp, GeminiWorker, ChatInput, ChatBrowser

# Create QAapp fixture if needed (pytest-qt already provides a qtbot fixture)
@pytest.fixture(scope="session", autouse=True)
def qapp():
    # Make sure we have a single QApplication instance for testing PySide6 elements
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    yield app


def test_widget_initialization(qtbot):
    """Test that all required UI elements initialize properly with correct properties."""
    window = MSAICopilotApp()
    qtbot.addWidget(window)

    # Check window title
    assert window.windowTitle() == "MS AI Copilot - OpenMS Suite"

    # Check key widgets
    assert isinstance(window.api_input, QLineEdit)
    assert window.api_input.echoMode() == QLineEdit.Password

    assert isinstance(window.chat_display, ChatBrowser)
    assert isinstance(window.user_input, ChatInput)
    assert isinstance(window.send_btn, QPushButton)
    assert isinstance(window.toggle_visibility_btn, QPushButton)
    assert isinstance(window.clear_btn, QPushButton)

    # Initial Welcome message check
    chat_text = window.chat_display.toHtml()
    assert "MS AI Copilot" in chat_text
    assert "Welcome" in chat_text


def test_toggle_api_visibility(qtbot):
    """Test toggle visibility of the API key line edit field."""
    window = MSAICopilotApp()
    qtbot.addWidget(window)

    # Initial state is password
    assert window.api_input.echoMode() == QLineEdit.Password
    assert window.toggle_visibility_btn.text() == "Show"

    # Click to toggle to normal view
    window.toggle_visibility_btn.click()
    assert window.api_input.echoMode() == QLineEdit.Normal
    assert window.toggle_visibility_btn.text() == "Hide"

    # Click again to hide it
    window.toggle_visibility_btn.click()
    assert window.api_input.echoMode() == QLineEdit.Password
    assert window.toggle_visibility_btn.text() == "Show"


def test_clear_chat(qtbot):
    """Test clear chat functionality."""
    window = MSAICopilotApp()
    qtbot.addWidget(window)

    # Add custom text to chat browser
    window.chat_display.append("User message text")
    assert "User message text" in window.chat_display.toPlainText()

    # Clear chat
    window.clear_btn.click()

    # Ensure custom message is cleared and welcome message is re-appended
    assert "User message text" not in window.chat_display.toPlainText()
    assert "Welcome" in window.chat_display.toPlainText()


def test_gemini_worker_without_api_key(qtbot):
    """Test GeminiWorker behaviour when API Key is missing."""
    worker = GeminiWorker(api_key="")

    # Track signals - Wait for finished or error_occurred
    with qtbot.waitSignal(worker.finished, timeout=1000):
        worker.send_message("Hello")


@patch("google.genai.Client")
def test_gemini_worker_success(mock_client_class, qtbot):
    """Test GeminiWorker correct API integration flow with mocked Client and Chats."""
    # Mock return values for client/chats
    mock_client = MagicMock()
    mock_chat = MagicMock()
    mock_response = MagicMock()

    mock_response.text = "Hello! I am Gemini, how can I help you?"
    mock_chat.send_message.return_value = mock_response
    mock_client.chats.create.return_value = mock_chat
    mock_client_class.return_value = mock_client

    worker = GeminiWorker(api_key="valid-key")

    # Connect signals to mock slots/handlers to verify output
    signals_received = []

    def on_response(text):
        signals_received.append(("response", text))

    def on_status(status):
        signals_received.append(("status", status))

    worker.response_received.connect(on_response)
    worker.status_changed.connect(on_status)

    # Execute inside background event loop testing
    with qtbot.waitSignal(worker.finished, timeout=1000):
        worker.send_message("Testing OpenMS integration")

    # Verify clients are created and methods are called correctly
    mock_client_class.assert_called_once_with(api_key="valid-key")
    mock_client.chats.create.assert_called_once_with(model="gemini-2.5-flash")
    mock_chat.send_message.assert_called_once_with("Testing OpenMS integration")

    # Check signal values
    assert any(sig == ("response", "Hello! I am Gemini, how can I help you?") for sig in signals_received)
    assert any("Thinking" in sig[1] for sig in signals_received if sig[0] == "status")


@patch("google.genai.Client")
def test_gemini_worker_failure(mock_client_class, qtbot):
    """Test GeminiWorker handles connection or api authentication errors gracefully."""
    mock_client = MagicMock()
    mock_client.chats.create.side_effect = Exception("Invalid API Key or Service Unavailable")
    mock_client_class.return_value = mock_client

    worker = GeminiWorker(api_key="bad-key")

    signals_received = []
    def on_error(err):
        signals_received.append(err)

    worker.error_occurred.connect(on_error)

    with qtbot.waitSignal(worker.finished, timeout=1000):
        worker.send_message("Hi")

    assert len(signals_received) == 1
    assert "Invalid API Key or Service Unavailable" in signals_received[0]


@patch("google.genai.Client")
def test_ms_ai_copilot_app_thread_safe_communication(mock_client_class, qtbot):
    """Test MSAICopilotApp is communicating with background thread safely through signals."""
    mock_client = MagicMock()
    mock_chat = MagicMock()
    mock_response = MagicMock()

    mock_response.text = "OpenMS Help response"
    mock_chat.send_message.return_value = mock_response
    mock_client.chats.create.return_value = mock_chat
    mock_client_class.return_value = mock_client

    window = MSAICopilotApp()
    qtbot.addWidget(window)

    window.api_input.setText("mock-valid-key")
    window.user_input.setPlainText("Hello Copilot")

    # Trigger message sending
    window.send_btn.click()

    # Wait until the UI updates with the mock response from the background thread
    qtbot.waitUntil(lambda: "OpenMS Help response" in window.chat_display.toPlainText(), timeout=3000)

    # Clean up thread to prevent "QThread: Destroyed while thread is still running"
    if window.worker_thread and window.worker_thread.isRunning():
        window.worker_thread.quit()
        window.worker_thread.wait()
