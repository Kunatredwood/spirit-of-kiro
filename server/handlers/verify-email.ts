import { VerifyEmailMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ConfirmSignUpCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface VerifyEmailResponse {
  type: string;
  body?: any;
}

export default async function handleVerifyEmail(state: ConnectionState, data: VerifyEmailMessage): Promise<VerifyEmailResponse> {
  const { username, code } = data.body;

  if (!username) {
    return {
      type: "verification_failure",
      body: "`username` is required"
    };
  }

  if (!code) {
    return {
      type: "verification_failure",
      body: "`code` is required"
    };
  }

  try {
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: username,
      ConfirmationCode: code
    });

    await cognitoClient.send(confirmCommand);

    // Note: We don't have the UserSub here, but we can get it after signin
    return {
      type: "verification_success",
      body: { 
        username,
        userId: '' // Will be populated on signin
      }
    };
  } catch (error: any) {
    console.error('Verification error:', error);
    
    // Handle specific Cognito error codes
    if (error.name === 'CodeMismatchException') {
      return {
        type: "verification_failure",
        body: "Invalid code. Please check and try again."
      };
    }
    
    if (error.name === 'ExpiredCodeException') {
      return {
        type: "verification_failure",
        body: "Code has expired. Please request a new one."
      };
    }
    
    if (error.name === 'NotAuthorizedException') {
      return {
        type: "verification_failure",
        body: "User is already verified or authorization failed."
      };
    }
    
    return {
      type: "verification_failure",
      body: error.message
    };
  }
}
