# File: backend/app/services/email_service.py
import asyncio
import logging
from typing import List, Optional, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib # For sending emails asynchronously

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_tls = settings.SMTP_TLS
        self.from_email = settings.EMAILS_FROM_EMAIL
        self.from_name = settings.EMAILS_FROM_NAME

    async def _send_email(
        self,
        recipient_email: str,
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
    ) -> bool:
        if not settings.emails_enabled:
            logger.warning("Email sending is disabled (SMTP not configured). Email not sent.")
            # For development, you might print the email content here instead of sending
            # print(f"--- Pretend Sending Email ---")
            # print(f"To: {recipient_email}")
            # print(f"From: {self.from_name} <{self.from_email}>")
            # print(f"Subject: {subject}")
            # if text_content: print(f"Text Body:\n{text_content}")
            # if html_content: print(f"HTML Body:\n{html_content}")
            # print(f"--------------------------")
            return True # Simulate success if emails are disabled

        if not recipient_email:
            logger.error("No recipient email provided.")
            return False
        if not (html_content or text_content):
            logger.error("No email content (HTML or text) provided.")
            return False

        message = MIMEMultipart("alternative")
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = recipient_email
        message["Subject"] = subject

        if text_content:
            message.attach(MIMEText(text_content, "plain"))
        if html_content:
            message.attach(MIMEText(html_content, "html"))
        
        # Ensure SMTP settings are present
        if not all([self.smtp_host, self.smtp_port, self.from_email]):
            logger.error("SMTP settings (host, port, from_email) are not fully configured. Cannot send email.")
            return False


        try:
            smtp_client = aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=self.smtp_tls, # TLS will be started after connect if True and not start_tls
                # start_tls=False # Set to True if server expects STARTTLS explicitly after connection
            )
            await smtp_client.connect()

            if self.smtp_user and self.smtp_password and self.smtp_tls: # Login only if credentials provided and TLS is used
                 # If server requires STARTTLS before login even if use_tls=True was set for initial connection
                if not smtp_client.is_connected_to_tls_server and self.smtp_tls: # Check if already on TLS
                    # Some servers might need explicit STARTTLS even if use_tls is true for initial connect.
                    # aiosmtplib handles this based on use_tls; explicit start_tls is usually for non-TLS initial connect.
                    pass # aiosmtplib handles TLS upgrade based on use_tls

                await smtp_client.login(self.smtp_user, self.smtp_password)

            await smtp_client.send_message(message)
            logger.info(f"Email sent successfully to {recipient_email} with subject: {subject}")
            return True
        except aiosmtplib.SMTPException as e:
            logger.error(f"SMTP error sending email to {recipient_email}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email to {recipient_email}: {e}")
            return False
        finally:
            if 'smtp_client' in locals() and smtp_client.is_connected:
                await smtp_client.quit()

    async def send_password_reset_email(
        self, recipient_email: str, username: str, reset_link: str
    ) -> bool:
        """
        Sends a password reset email to the user.
        """
        subject = f"{settings.PROJECT_NAME} - Password Reset Request"
        
        text_content = f"""
        Hello {username},

        You requested a password reset for your {settings.PROJECT_NAME} account.
        Please click the link below to reset your password:
        {reset_link}

        If you did not request this, please ignore this email. Your password will remain unchanged.

        Thanks,
        The {settings.PROJECT_NAME} Team
        """
        
        html_content = f"""
        <html>
        <body>
            <p>Hello {username},</p>
            <p>You requested a password reset for your {settings.PROJECT_NAME} account.</p>
            <p>Please click the link below to reset your password:</p>
            <p><a href="{reset_link}">Reset Your Password</a></p>
            <p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>
            <br>
            <p>Thanks,</p>
            <p>The {settings.PROJECT_NAME} Team</p>
        </body>
        </html>
        """
        return await self._send_email(recipient_email, subject, html_content, text_content)

    async def send_registration_confirmation_email(
        self, recipient_email: str, username: str, confirmation_link: str
    ) -> bool:
        """
        Sends an account confirmation/welcome email.
        (Firebase often handles its own email verification, this could be supplemental)
        """
        subject = f"Welcome to {settings.PROJECT_NAME}, {username}!"
        
        text_content = f"""
        Hello {username},

        Welcome to {settings.PROJECT_NAME}! We're excited to have you.
        Please confirm your email address by clicking the link below:
        {confirmation_link}

        If you did not sign up for an account, please ignore this email.

        Thanks,
        The {settings.PROJECT_NAME} Team
        """

        html_content = f"""
        <html>
        <body>
            <p>Hello {username},</p>
            <p>Welcome to {settings.PROJECT_NAME}! We're excited to have you.</p>
            <p>Please confirm your email address by clicking the link below:</p>
            <p><a href="{confirmation_link}">Confirm Your Email</a></p>
            <p>If you did not sign up for an account, please ignore this email.</p>
            <br>
            <p>Thanks,</p>
            <p>The {settings.PROJECT_NAME} Team</p>
        </body>
        </html>
        """
        return await self._send_email(recipient_email, subject, html_content, text_content)

    async def send_new_game_credentials_email(
        self, 
        admin_email: str, 
        admin_name: str, 
        game_name: str, 
        game_id: str, 
        players_credentials: List[Dict[str, Any]] # List of dicts like {"player_number": 1, "username": "Player 1", "email": "...", "temp_password": "..."}
    ) -> bool:
        """
        Sends an email to the admin with the credentials for all players in a newly created game.
        """
        subject = f"New Soil Game Created: '{game_name}' - Player Credentials"

        player_details_text = "\n".join([
            f"  Player {p['player_number']} ({p['username']}):\n    Login Email: {p['email']}\n    Temporary Password: {p['temp_password']}\n    Login Link: https://{settings.BACKEND_CORS_ORIGINS.split(',')[0].replace('http://','').replace('https://','').split(':')[0]}/login?gameId={game_id}&player={p['player_number']}" 
            for p in players_credentials
        ])
        # Note: The login link above assumes a frontend path /login and specific query params. Adjust as needed.
        # It also assumes the first CORS origin is the primary frontend URL.

        text_content = f"""
        Hello {admin_name},

        Your new Soil game '{game_name}' (ID: {game_id}) has been successfully created.

        Here are the login details for the players:
        {player_details_text}

        Please distribute these credentials to the respective players.
        They can log in using the provided link and their temporary password.
        It is recommended that players change their temporary passwords upon first login if your system supports it.

        Game Link (for players, if different from individual login links):
        [You might want to provide a general link to the game or frontend]

        Remember to provide players with any necessary game materials (e.g., Sortenpass PDF).

        Good luck with your game!

        The {settings.PROJECT_NAME} Team
        """

        player_details_html_parts = []
        for p in players_credentials:
            login_url = f"https://{settings.BACKEND_CORS_ORIGINS.split(',')[0].replace('http://','').replace('https://','').split(':')[0]}/login?gameId={game_id}&player={p['player_number']}"
            player_details_html_parts.append(f"""
            <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee;">
                <h4>Player {p['player_number']} ({p['username']})</h4>
                <p><strong>Login Email:</strong> {p['email']}</p>
                <p><strong>Temporary Password:</strong> {p['temp_password']}</p>
                <p><strong>Login Link:</strong> <a href="{login_url}">{login_url}</a></p>
            </div>
            """)
        player_details_html = "".join(player_details_html_parts)
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Hello {admin_name},</p>
            <p>Your new Soil game '<strong>{game_name}</strong>' (ID: {game_id}) has been successfully created.</p>
            <p>Here are the login details for the players:</p>
            {player_details_html}
            <p>Please distribute these credentials to the respective players. They can log in using the provided link and their temporary password. It is recommended that players change their temporary passwords upon first login if your system supports it.</p>
            <p><em>Remember to provide players with any necessary game materials (e.g., Sortenpass PDF).</em></p>
            <p>Good luck with your game!</p>
            <br>
            <p>The {settings.PROJECT_NAME} Team</p>
        </body>
        </html>
        """
        return await self._send_email(admin_email, subject, html_content, text_content)


# Dependency for FastAPI
async def get_email_service() -> EmailService:
    return EmailService()

# Example Usage (for testing locally, not part of FastAPI app directly)
async def main_test_email():
    email_service = EmailService()
    
    # Test Password Reset
    # success_reset = await email_service.send_password_reset_email(
    #     recipient_email="testuser@example.com",
    #     username="Test User",
    #     reset_link="https://yourfrontend.com/reset-password?token=sometoken123"
    # )
    # print(f"Password Reset Email Send Attempt: {'Success' if success_reset else 'Failed'}")

    # Test Registration Confirmation
    # success_confirm = await email_service.send_registration_confirmation_email(
    #     recipient_email="newuser@example.com",
    #     username="New User",
    #     confirmation_link="https://yourfrontend.com/confirm-email?token=confirmtoken456"
    # )
    # print(f"Registration Confirmation Email Send Attempt: {'Success' if success_confirm else 'Failed'}")

    # Test New Game Credentials
    players_data_example = [
        {"player_number": 1, "username": "Player Alpha", "email": "player1@example.com", "temp_password": "passA"},
        {"player_number": 2, "username": "Player Beta", "email": "player2@example.com", "temp_password": "passB"},
    ]
    success_new_game = await email_service.send_new_game_credentials_email(
        admin_email="admin@example.com",
        admin_name="Game Admin",
        game_name="Test Soil Game Alpha",
        game_id="gameABC123",
        players_credentials=players_data_example
    )
    print(f"New Game Credentials Email Send Attempt: {'Success' if success_new_game else 'Failed'}")


if __name__ == "__main__":
    # This block will only run if the script is executed directly
    # Ensure your .env file is in the project root and has SMTP settings if you want to actually send.
    # Create a dummy .env if needed for local testing without sending.
    # Example .env content for testing (won't send unless real SMTP is used):
    # SMTP_HOST="localhost"
    # SMTP_PORT=1025 
    # EMAILS_FROM_EMAIL="noreply@soil.local"
    # EMAILS_FROM_NAME="Soil Game (Dev)"
    # (Run a local SMTP server like `python -m smtpd -c DebuggingServer -n localhost:1025` in another terminal)
    
    if settings.ENVIRONMENT == "development": # Only run test if in dev
        asyncio.run(main_test_email())
    else:
        print("Email test script is intended for development environment only.")