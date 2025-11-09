import { ServerWebSocket } from 'bun';

export interface ConnectionState {
  ws: ServerWebSocket;
  userId?: string;
  username?: string;
}

export interface SignupMessage {
    type: 'signup';
    body: {
        username: string;
        password: string;
    };
}

export interface SigninMessage {
    type: 'signin';
    body: {
        username: string;
        password: string;
    };
}

export interface PullItemMessage {
    type: 'pull-item';
    params: {
        userId: string;
    };
}

export interface ListInventoryMessage {
    type: 'list-inventory';
    body: {
        inventoryId: string;
    };
}

export interface DiscardItemMessage {
    type: 'discard-item';
    body: {
        itemId: string;
    };
}

export interface MoveItemMessage {
    type: 'move-item';
    body: {
        itemId: string;
        targetInventory: string;
    };
}

export interface UseSkillMessage {
    type: 'use-skill';
    body: {
        toolId: string;
        toolSkillIndex: number;
        targetIds: string[];
    };
}

export interface SellItemMessage {
    type: 'sell-item';
    body: {
        itemId: string;
    };
}

export interface FetchPersonaMessage {
  type: 'fetch-persona';
  body: {};
}

export interface PeekDiscardedMessage {
    type: 'peek-discarded';
    body: {
        numberOfItems: number;
    };
}

export interface BuyDiscardedMessage {
    type: 'buy-discarded';
    body: {
        itemId: string;
    };
}

export interface VerifyEmailMessage {
    type: 'verify_email';
    body: {
        username: string;
        code: string;
    };
}

export interface ResendVerificationMessage {
    type: 'resend_verification';
    body: {
        username: string;
    };
}

export interface ForgotPasswordMessage {
    type: 'forgot_password';
    body: {
        username: string;
    };
}

export interface ResetPasswordMessage {
    type: 'reset_password';
    body: {
        username: string;
        code: string;
        newPassword: string;
    };
}

export type WebSocketMessage = SignupMessage | SigninMessage | PullItemMessage | ListInventoryMessage | DiscardItemMessage | MoveItemMessage | UseSkillMessage | SellItemMessage | FetchPersonaMessage | PeekDiscardedMessage | BuyDiscardedMessage | VerifyEmailMessage | ResendVerificationMessage | ForgotPasswordMessage | ResetPasswordMessage;

// Response Types for Email Verification and Password Reset

export interface SignupPendingVerificationResponse {
    type: 'signup_pending_verification';
    body: {
        username: string;
        userId: string;
        codeDeliveryDetails: {
            destination: string;
            deliveryMedium: string;
        };
    };
}

export interface VerificationSuccessResponse {
    type: 'verification_success';
    body: {
        username: string;
        userId: string;
    };
}

export interface VerificationFailureResponse {
    type: 'verification_failure';
    body: string; // Error message
}

export interface ResetCodeSentResponse {
    type: 'reset_code_sent';
    body: {
        codeDeliveryDetails: {
            destination: string;
            deliveryMedium: string;
        };
    };
}

export interface PasswordResetSuccessResponse {
    type: 'password_reset_success';
    body: {
        message: string;
    };
}

export interface PasswordResetFailureResponse {
    type: 'password_reset_failure';
    body: string; // Error message
}

export interface SigninUnverifiedResponse {
    type: 'signin_unverified';
    body: {
        username: string;
        message: string;
    };
}
