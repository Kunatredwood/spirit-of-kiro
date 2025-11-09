# Implementation Plan

- [x] 1. Update server types and message definitions
  - Add new WebSocket message type interfaces for verification and password reset flows
  - Add new response type interfaces for all new server responses
  - Update WebSocketMessage union type to include new message types
  - _Requirements: 1.1, 1.2, 2.1, 3.2, 4.1_

- [x] 2. Implement server-side email verification handlers





- [x] 2.1 Create verify-email handler


  - Create new file server/handlers/verify-email.ts
  - Write handler function that accepts username and verification code
  - Implement ConfirmSignUpCommand call to Cognito
  - Handle success case returning verification_success response
  - Handle error cases (CodeMismatchException, ExpiredCodeException, NotAuthorizedException)
  - _Requirements: 1.3, 1.4, 1.5_


- [x] 2.2 Create resend-verification handler

  - Create new file server/handlers/resend-verification.ts
  - Write handler function that accepts username
  - Implement ResendConfirmationCodeCommand call to Cognito
  - Handle rate limiting through Cognito's built-in throttling (LimitExceededException)
  - Return success response with code delivery details
  - _Requirements: 2.1, 2.2, 2.3, 2.4_


- [x] 2.3 Modify signup handler to remove auto-confirmation

  - Update server/handlers/signup.ts
  - Remove AdminConfirmSignUpCommand import and call
  - Change response type from signup_success to signup_pending_verification
  - Include CodeDeliveryDetails from SignUpCommand result in response body
  - Ensure UserSub is still captured for user tracking
  - _Requirements: 1.1, 5.4_

- [x] 2.4 Modify signin handler to check verification status


  - Update server/handlers/signin.ts
  - Add try-catch to detect UserNotConfirmedException from InitiateAuthCommand
  - Return signin_unverified response when user is not verified
  - Maintain existing authentication flow for verified users
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Implement server-side password reset handlers





- [x] 3.1 Create forgot-password handler


  - Create new file server/handlers/forgot-password.ts
  - Write handler function that accepts username
  - Implement ForgotPasswordCommand call to Cognito
  - Return generic success message to prevent user enumeration
  - Handle UserNotFoundException with same generic response
  - Include code delivery details in response
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 3.2 Create reset-password handler


  - Create new file server/handlers/reset-password.ts
  - Write handler function that accepts username, code, and new password
  - Implement ConfirmForgotPasswordCommand call to Cognito
  - Handle success case returning password_reset_success response
  - Handle error cases (CodeMismatchException, ExpiredCodeException, InvalidPasswordException)
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 4. Register new handlers in server message router





  - Update server/server.ts
  - Import verify-email, resend-verification, forgot-password, and reset-password handlers
  - Add case statements for verify_email, resend_verification, forgot_password, and reset_password message types
  - Import new message types (VerifyEmailMessage, ResendVerificationMessage, ForgotPasswordMessage, ResetPasswordMessage)
  - Ensure handlers are called with correct ConnectionState and message data
  - _Requirements: 1.1, 2.1, 3.2, 4.1_

- [x] 5. Create client-side verification view





- [x] 5.1 Create VerifyEmailView component


  - Create new file client/src/views/VerifyEmailView.vue
  - Create Vue component with cyberpunk-styled form matching SignUpView/SignInView aesthetic
  - Add input field for 6-digit verification code
  - Display email address where code was sent (from route params or state)
  - Add submit button to verify code
  - Add resend code button with 60-second cooldown timer
  - Implement WebSocket message sending for verify_email
  - Add event listeners for verification_success (redirect to signin with success message)
  - Add event listeners for verification_failure (display error)
  - Add event listeners for resend_verification response
  - Include canvas particle background, scanlines, vignette, and HUD corners
  - _Requirements: 1.2, 1.3, 1.4, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5.2 Update SignUpView to handle pending verification


  - Update client/src/views/SignUpView.vue
  - Add event listener for signup_pending_verification response type
  - Store username and email in route params when redirecting
  - Redirect to /verify-email route on pending verification
  - Remove signup_success event listener redirect to /play
  - _Requirements: 1.1, 1.2_

- [x] 6. Create client-side password reset views




- [x] 6.1 Create ForgotPasswordView component


  - Create new file client/src/views/ForgotPasswordView.vue
  - Create Vue component with cyberpunk-styled form matching existing auth views
  - Add email input field
  - Add submit button to request reset code
  - Implement WebSocket message sending for forgot_password
  - Add event listener for reset_code_sent response (store email and redirect to /reset-password)
  - Display error messages for failures
  - Add back link to signin page
  - Include canvas particle background, scanlines, vignette, and HUD corners
  - _Requirements: 3.1, 3.2, 6.1, 6.3, 6.5_

- [x] 6.2 Create ResetPasswordView component


  - Create new file client/src/views/ResetPasswordView.vue
  - Create Vue component with cyberpunk-styled form matching existing auth views
  - Add input field for reset code
  - Add input field for new password
  - Reuse password validation logic from SignUpView (length, lowercase, uppercase, number, symbol)
  - Display password requirements checklist with checkmarks
  - Add submit button to complete reset (disabled until password valid)
  - Implement WebSocket message sending for reset_password
  - Add event listener for password_reset_success (redirect to signin with success message)
  - Add event listener for password_reset_failure (display error)
  - Include canvas particle background, scanlines, vignette, and HUD corners
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.3 Update SignInView to add forgot password link


  - Update client/src/views/SignInView.vue
  - Add "Forgot Password?" link below password field styled as toggle-link
  - Link should navigate to /forgot-password route
  - Add event listener for signin_unverified response type
  - Redirect to /verify-email with username when user is unverified
  - Display appropriate error message for unverified users
  - _Requirements: 3.1, 5.2, 5.3_

- [x] 7. Update client router configuration





  - Update client/src/router/index.ts
  - Add route for /verify-email pointing to VerifyEmailView
  - Add route for /forgot-password pointing to ForgotPasswordView
  - Add route for /reset-password pointing to ResetPasswordView
  - Ensure routes are accessible without authentication (add to beforeEnter allow list)
  - Import new view components
  - _Requirements: 1.2, 3.1, 4.4_

- [ ]* 8. Integration testing and validation
  - Test complete signup and verification flow end-to-end
  - Test resend verification code functionality with cooldown
  - Test signin rejection for unverified users
  - Test complete password reset flow end-to-end
  - Test error handling for invalid verification codes
  - Test error handling for expired codes
  - Test error handling for invalid passwords
  - Verify UI maintains cyberpunk aesthetic across all new views
  - Test mobile responsiveness of new views
  - Verify backward compatibility with existing verified users
  - Test rate limiting on resend verification
  - Test user enumeration prevention on password reset
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.5, 6.5_
