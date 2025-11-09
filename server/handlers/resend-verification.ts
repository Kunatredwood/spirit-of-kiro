import { ResendVerificationMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ResendConfirmationCodeCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface ResendVerificationResponse {
  type: string;
  body?: any;
}

export default async function handleResendVerification(state: ConnectionState, data: ResendVerificationMessage): Promise<ResendVerificationResponse> {
  const { username } = data.body;

  if (!username) {
    return {
      type: "verification_failure",
      body: "`username` is required"
    };
  }

  try {
    const resendCommand = new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: username
    });

    const result = await cognitoClient.send(resendCommand);

    return {
      type: "resend_verification_success",
      body: {
        codeDeliveryDetails: {
          destination: result.CodeDeliveryDetails?.Destination || '',
          deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium || 'EMAIL'
        }
      }
    };
  } catch (error: any) {
    console.error('Resend verification error:', error);
    
    // Handle rate limiting
    if (error.name === 'LimitExceededException') {
      return {
        type: "verification_failure",
        body: "Too many attempts. Please try again later."
      };
    }
    
    return {
      type: "verification_failure",
      body: error.message
    };
  }
}
