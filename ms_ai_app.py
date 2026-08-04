import os
import sys
import markdown
from html import escape

from PySide6.QtCore import Qt, Signal, Slot, QThread, QObject
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QTextBrowser, QPlainTextEdit,
    QFrame, QStatusBar
)
from PySide6.QtGui import QIcon, QFont, QKeyEvent

class ChatInput(QPlainTextEdit):
    """Custom input widget that emits a signal on Enter, and inserts a newline on Shift+Enter."""
    submit_triggered = Signal()

    def keyPressEvent(self, event: QKeyEvent):
        if event.key() in (Qt.Key_Return, Qt.Key_Enter):
            if event.modifiers() & Qt.ShiftModifier:
                super().keyPressEvent(event)
            else:
                self.submit_triggered.emit()
        else:
            super().keyPressEvent(event)


class ChatBrowser(QTextBrowser):
    """Custom text browser configured for displaying chat bubbles with HTML/CSS support."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setOpenExternalLinks(True)
        # Apply standard CSS for code blocks, tables, and spacing in chat bubbles
        self.document().setDefaultStyleSheet("""
            pre {
                background-color: #141414;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                padding: 8px;
                font-family: 'Courier New', Courier, monospace;
                color: #a9ffaf;
            }
            code {
                background-color: #141414;
                font-family: 'Courier New', Courier, monospace;
                color: #a9ffaf;
                padding: 1px 3px;
                border-radius: 3px;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 8px 0;
            }
            th, td {
                border: 1px solid #3c3c3c;
                padding: 6px;
                text-align: left;
            }
            th {
                background-color: #252526;
                font-weight: bold;
            }
            a {
                color: #58a6ff;
            }
        """)


class GeminiWorker(QObject):
    """Worker object that runs on a separate QThread and handles Gemini API interactions."""
    response_received = Signal(str)
    error_occurred = Signal(str)
    status_changed = Signal(str)
    finished = Signal()

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key
        self.client = None
        self.chat = None

    @Slot(str)
    def update_api_key(self, api_key: str):
        """Update API Key and reset client session."""
        self.api_key = api_key
        self.client = None
        self.chat = None
        self.status_changed.emit("API Key updated. Session reset.")

    @Slot(str)
    def send_message(self, prompt: str):
        """Send message to Google GenAI in background."""
        self.status_changed.emit("Thinking...")
        try:
            from google import genai
            if not self.api_key:
                self.error_occurred.emit("API Key is missing. Please provide a valid Gemini API Key.")
                self.status_changed.emit("Error: API Key missing")
                self.finished.emit()
                return

            if not self.client:
                self.status_changed.emit("Initializing Gemini Client...")
                self.client = genai.Client(api_key=self.api_key)
                self.chat = self.client.chats.create(model="gemini-2.5-flash")

            response = self.chat.send_message(prompt)
            if hasattr(response, 'text') and response.text:
                self.response_received.emit(response.text)
            else:
                self.error_occurred.emit("Received an empty response from Gemini API.")
        except Exception as e:
            self.error_occurred.emit(f"Gemini API Error: {str(e)}")
        finally:
            self.status_changed.emit("Ready")
            self.finished.emit()


class MSAICopilotApp(QMainWindow):
    """Main Application Window for MS AI Copilot."""
    # Define custom signals to trigger thread-safe operations on background worker
    sig_send_message = Signal(str)
    sig_update_api_key = Signal(str)

    def __init__(self):
        super().__init__()
        self.setWindowTitle("MS AI Copilot - OpenMS Suite")
        self.resize(800, 650)

        # Threading references
        self.worker_thread = None
        self.worker = None

        # Build UI layout
        self.init_ui()

        # Load API Key (env fallback or empty)
        self.load_initial_api_key()

    def init_ui(self):
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(15, 15, 15, 15)
        main_layout.setSpacing(12)

        # 1. Header Widget
        header_widget = QWidget()
        header_widget.setObjectName("headerWidget")
        header_layout = QHBoxLayout(header_widget)
        header_layout.setContentsMargins(0, 0, 0, 10)

        header_title = QLabel("MS AI Copilot - OpenMS Suite")
        header_title.setObjectName("headerTitle")
        header_layout.addWidget(header_title)
        header_layout.addStretch()

        main_layout.addWidget(header_widget)

        # 2. API Key Input Field Frame
        api_frame = QFrame()
        api_frame.setObjectName("apiKeyFrame")
        api_layout = QHBoxLayout(api_frame)
        api_layout.setContentsMargins(12, 8, 12, 8)
        api_layout.setSpacing(10)

        api_label = QLabel("Gemini API Key:")
        self.api_input = QLineEdit()
        self.api_input.setPlaceholderText("Enter your Google Gemini API Key here...")
        self.api_input.setEchoMode(QLineEdit.Password)
        self.api_input.textChanged.connect(self.on_api_key_changed)

        self.toggle_visibility_btn = QPushButton("Show")
        self.toggle_visibility_btn.setCheckable(True)
        self.toggle_visibility_btn.clicked.connect(self.toggle_api_visibility)
        self.toggle_visibility_btn.setObjectName("toggleBtn")

        api_layout.addWidget(api_label)
        api_layout.addWidget(self.api_input)
        api_layout.addWidget(self.toggle_visibility_btn)

        main_layout.addWidget(api_frame)

        # 3. Chat Window
        self.chat_display = ChatBrowser()
        main_layout.addWidget(self.chat_display, stretch=1)

        # 4. Input Box & Send Button Section
        input_container = QWidget()
        input_layout = QHBoxLayout(input_container)
        input_layout.setContentsMargins(0, 0, 0, 0)
        input_layout.setSpacing(10)

        self.user_input = ChatInput()
        self.user_input.setPlaceholderText("Type a message... (Press Enter to send, Shift+Enter for new line)")
        self.user_input.submit_triggered.connect(self.send_user_message)

        button_container = QWidget()
        button_layout = QVBoxLayout(button_container)
        button_layout.setContentsMargins(0, 0, 0, 0)
        button_layout.setSpacing(8)

        self.send_btn = QPushButton("Send")
        self.send_btn.clicked.connect(self.send_user_message)
        self.send_btn.setMinimumHeight(40)

        self.clear_btn = QPushButton("Clear Chat")
        self.clear_btn.clicked.connect(self.clear_chat)
        self.clear_btn.setObjectName("clearBtn")

        button_layout.addWidget(self.send_btn)
        button_layout.addWidget(self.clear_btn)

        input_layout.addWidget(self.user_input, stretch=1)
        input_layout.addWidget(button_container)

        main_layout.addWidget(input_container)

        # 5. Status Bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready")

        # Setup modern dark style matching OpenMS Suite color scheme
        self.apply_stylesheet()

        # Display initial welcome message
        self.display_welcome_message()

    def apply_stylesheet(self):
        """Applies a custom QSS stylesheet with OpenMS branding colors."""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #121212;
            }
            QWidget {
                color: #e0e0e0;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 13px;
            }
            #headerWidget {
                background-color: transparent;
                border-bottom: 2px solid #29379B;
            }
            #headerTitle {
                color: #ffffff;
                font-size: 18px;
                font-weight: bold;
            }
            #apiKeyFrame {
                background-color: #1e1e1e;
                border: 1px solid #2d2d2d;
                border-radius: 6px;
            }
            QLabel {
                font-weight: bold;
                color: #ffffff;
            }
            QLineEdit {
                background-color: #2d2d2d;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                padding: 6px 10px;
                color: #ffffff;
            }
            QLineEdit:focus {
                border: 1px solid #29379B;
            }
            QPlainTextEdit {
                background-color: #1e1e1e;
                border: 1px solid #2d2d2d;
                border-radius: 6px;
                padding: 10px;
                color: #ffffff;
                font-size: 14px;
            }
            QPlainTextEdit:focus {
                border: 1px solid #29379B;
            }
            QPushButton {
                background-color: #29379B;
                border: none;
                border-radius: 4px;
                color: #ffffff;
                font-weight: bold;
                padding: 6px 15px;
            }
            QPushButton:hover {
                background-color: #3d4dc6;
            }
            QPushButton:pressed {
                background-color: #1d2772;
            }
            QPushButton:disabled {
                background-color: #444444;
                color: #888888;
            }
            #toggleBtn {
                background-color: #333333;
                border: 1px solid #444444;
            }
            #toggleBtn:hover {
                background-color: #444444;
            }
            #toggleBtn:checked {
                background-color: #29379B;
                border: 1px solid #29379B;
            }
            #clearBtn {
                background-color: #2d2d2d;
                border: 1px solid #3c3c3c;
            }
            #clearBtn:hover {
                background-color: #3d3d3d;
                border: 1px solid #4c4c4c;
            }
            QScrollBar:vertical {
                background-color: #121212;
                width: 10px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                background-color: #2d2d2d;
                min-height: 20px;
                border-radius: 5px;
            }
            QScrollBar::handle:vertical:hover {
                background-color: #3c3c3c;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                background: none;
                height: 0px;
            }
            QStatusBar {
                background-color: #1a1a1a;
                color: #888888;
                font-size: 11px;
                border-top: 1px solid #2d2d2d;
            }
        """)

    def load_initial_api_key(self):
        """Loads API key from environment variable GEMINI_API_KEY if present."""
        env_key = os.environ.get("GEMINI_API_KEY", "")
        if env_key:
            self.api_input.setText(env_key)
            self.status_bar.showMessage("Loaded API Key from GEMINI_API_KEY environment variable.")

    def toggle_api_visibility(self):
        """Toggles between hidden and plain text visibility for API key input."""
        if self.toggle_visibility_btn.isChecked():
            self.api_input.setEchoMode(QLineEdit.Normal)
            self.toggle_visibility_btn.setText("Hide")
        else:
            self.api_input.setEchoMode(QLineEdit.Password)
            self.toggle_visibility_btn.setText("Show")

    def display_welcome_message(self):
        """Appends initial system/welcome message to the chat view."""
        welcome_html = f"""
        <div style="margin: 8px 0; text-align: left;">
            <div style="display: inline-block; background-color: #252526; color: #e0e0e0; border-radius: 12px; padding: 10px 14px; max-width: 85%; border: 1px solid #3c3c3c;">
                <b>System:</b><br>
                Welcome to <b>MS AI Copilot</b>. I am ready to assist you with mass spectrometry, chromatography, and scientific workflows in OpenMS Suite.
                <br><br>
                Please ensure you have configured your <b>Google Gemini API Key</b> above, or via the <code>GEMINI_API_KEY</code> environment variable.
            </div>
        </div>
        """
        self.chat_display.append(welcome_html)

    def on_api_key_changed(self, new_key: str):
        """Handles change of API key in the UI field by updating the background worker."""
        if self.ensure_worker_initialized():
            # Emit signal to thread-safely update the worker on background thread
            self.sig_update_api_key.emit(new_key)

    def format_user_message(self, text: str) -> str:
        """Helper to format user bubble with alignment and branding colors."""
        escaped_text = escape(text).replace("\n", "<br>")
        return f"""
        <div style="margin: 8px 0; text-align: right;">
            <div style="display: inline-block; background-color: #29379B; color: #ffffff; border-radius: 12px; padding: 10px 14px; max-width: 80%; text-align: left;">
                <b>You:</b><br>{escaped_text}
            </div>
        </div>
        """

    def format_ai_message(self, markdown_text: str) -> str:
        """Helper to convert Markdown text to safe HTML bubbles."""
        html_body = markdown.markdown(markdown_text, extensions=['fenced_code', 'tables'])
        return f"""
        <div style="margin: 8px 0; text-align: left;">
            <div style="display: inline-block; background-color: #1e1e1e; color: #e0e0e0; border-radius: 12px; padding: 10px 14px; max-width: 80%; border: 1px solid #3c3c3c;">
                <b>Gemini:</b><br>{html_body}
            </div>
        </div>
        """

    def format_error_message(self, error_text: str) -> str:
        """Helper to display formatted system/error bubble."""
        escaped_err = escape(error_text).replace("\n", "<br>")
        return f"""
        <div style="margin: 8px 0; text-align: left;">
            <div style="display: inline-block; background-color: #5a1818; color: #ffcccc; border-radius: 12px; padding: 10px 14px; max-width: 80%; border: 1px solid #800000;">
                <b>System Error:</b><br>{escaped_err}
            </div>
        </div>
        """

    def clear_chat(self):
        """Clears chat conversation area and displays a brief confirmation."""
        self.chat_display.clear()
        self.display_welcome_message()
        self.status_bar.showMessage("Conversation cleared.")

    def ensure_worker_initialized(self) -> bool:
        """Initializes thread and worker if not already created."""
        api_key = self.api_input.text().strip()
        if not api_key:
            # We don't display error here on initial key change, but do so on message submission
            return False

        if not self.worker_thread:
            self.worker_thread = QThread()
            self.worker = GeminiWorker(api_key)
            self.worker.moveToThread(self.worker_thread)

            # Signal connections from Worker -> MainWindow
            self.worker.response_received.connect(self.on_response_received)
            self.worker.error_occurred.connect(self.on_error_occurred)
            self.worker.status_changed.connect(self.on_status_changed)

            # Signal connections from MainWindow -> Worker (to cross thread boundary safely!)
            self.sig_send_message.connect(self.worker.send_message)
            self.sig_update_api_key.connect(self.worker.update_api_key)

            # Start worker thread
            self.worker_thread.start()

        return True

    def send_user_message(self):
        """Sends the user's prompt to the background Gemini worker thread."""
        prompt = self.user_input.toPlainText().strip()
        if not prompt:
            return

        # Ensure UI/worker state is valid
        if not self.ensure_worker_initialized():
            self.chat_display.append(self.format_error_message("Please configure your Google Gemini API Key first."))
            self.status_bar.showMessage("Error: API Key missing")
            return

        # Visual feedback: disable input & buttons, append user bubble
        self.user_input.clear()
        self.user_input.setEnabled(False)
        self.send_btn.setEnabled(False)

        self.chat_display.append(self.format_user_message(prompt))

        # Scroll chat display to bottom
        self.chat_display.ensureCursorVisible()

        # Trigger background processing
        # Emit signal to thread-safely process in background QThread
        self.sig_send_message.emit(prompt)

    @Slot(str)
    def on_response_received(self, text: str):
        """Slot triggered when background worker finishes API call successfully."""
        self.chat_display.append(self.format_ai_message(text))
        self.chat_display.ensureCursorVisible()
        self.restore_ui_state()

    @Slot(str)
    def on_error_occurred(self, error_msg: str):
        """Slot triggered when background worker encounters an error."""
        self.chat_display.append(self.format_error_message(error_msg))
        self.chat_display.ensureCursorVisible()
        self.restore_ui_state()

    @Slot(str)
    def on_status_changed(self, status: str):
        """Slot triggered for status bar messages."""
        self.status_bar.showMessage(status)

    def restore_ui_state(self):
        """Re-enables the user input box and send button after operation completes."""
        self.user_input.setEnabled(True)
        self.send_btn.setEnabled(True)
        self.user_input.setFocus()

    def closeEvent(self, event):
        """Ensures background worker and threads are cleaned up correctly before shutdown."""
        if self.worker_thread and self.worker_thread.isRunning():
            self.worker_thread.quit()
            self.worker_thread.wait()
        super().closeEvent(event)


def main():
    app = QApplication(sys.argv)
    window = MSAICopilotApp()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
