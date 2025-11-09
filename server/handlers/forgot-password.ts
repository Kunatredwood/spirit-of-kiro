import { ForgotPasswordMessage, ConnectionState } from '../types';
import { COGNITO_CONFIG } from '../config';
import { 
  ForgotPasswordCommand,
  CognitoIdentityProviderClient 
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region
});

interface ForgotPasswordResponse {
  type: string;
  body?: any;
}

export default async function handleForgotPassword(state: ConnectionState, data: ForgotPasswordMessage): Promise<ForgotPasswordResponse> {
  const { username } = data.body;

  if (!username) {
    return {
      type: "password_reset_failure",
      body: "`username` is required"
    };
  }

  try {
    const forgotPasswordCommand = new ForgotPasswordCommand({
      ClientId: COGNITO_CONFIG.clientId,
      Username: username
    });

    const result = await cognitoClient.send(forgotPasswordCommand);

    // Return generic success message with code delivery details
    return {
      type: "reset_code_sent",
      body: {
        codeDeliveryDetails: {
          destination: result.CodeDeliveryDetails?.Destination || '',
          deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium || 'EMAIL'
        }
      }
    };
  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    // Return generic message to prevent user enumeration
    // Even if user doesn't exist, we return success
    if (error.name === 'UserNotFoundException') {
      return {
        type: "reset_code_sent",
        body: {
          codeDeliveryDetails: {
            destination: '***@***.***',
            deliveryMedium: 'EMAIL'
          }
        }
      };
    }
    
    // Handle rate limiting
    if (error.name === 'LimitExceededException') {
      return {
        type: "password_reset_failure",
        body: "Too many attempts. Please try again later."
      };
    }
    
    // For other errors, return generic message
    return {
      type: "reset_code_sent",
      body: {
        codeDeliveryDetails: {
          destination: '***@***.***',
          deliveryMedium: 'EMAIL'
        }
      }
    };
  }
}
