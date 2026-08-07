export interface LoginViewProps {
  onLoginSuccess: (user: any, accessToken: string, refreshToken: string) => void;
}
