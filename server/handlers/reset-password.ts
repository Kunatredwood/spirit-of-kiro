import { ResetPasswordMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ConfirmForgotPasswordCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface ResetPasswordResponse {
  type: string;
  body?: any;
}

export default async function handleResetPassword(state: ConnectionState, data: ResetPasswordMessage): Promise<ResetPasswordResponse> {
  const { username, code, newPassword } = data.body;

  if (!username) {
    return {
      type: "password_reset_failure",
      body: "`username` is required"
    };
  }

  if (!code) {
    return {
      type: "password_reset_failure",
      body: "`code` is required"
    };
  }

  if (!newPassword) {
    return {
      type: "password_reset_failure",
      body: "`newPassword` is required"
    };
  }

  try {
    const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: username,
      ConfirmationCode: code,
      Password: newPassword
    });

    await cognitoClient.send(confirmForgotPasswordCommand);

    return {
      type: "password_reset_success",
      body: {
        message: "Password has been reset successfully. You can now sign in with your new password."
      }
    };
  } catch (error: any) {
    console.error('Reset password error:', error);
    
    // Handle specific Cognito error codes
    if (error.name === 'CodeMismatchException') {
      return {
        type: "password_reset_failure",
        body: "Invalid code. Please check and try again."
      };
    }
    
    if (error.name === 'ExpiredCodeException') {
      return {
        type: "password_reset_failure",
        body: "Code has expired. Please request a new one."
      };
    }
    
    if (error.name === 'InvalidPasswordException') {
      return {
        type: "password_reset_failure",
        body: error.message || "Password does not meet requirements."
      };
    }
    
    if (error.name === 'LimitExceededException') {
      return {
        type: "password_reset_failure",
        body: "Too many attempts. Please try again later."
      };
    }
    
    return {
      type: "password_reset_failure",
      body: error.message
    };
  }
}
