$regResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"fullName":"AI Tester","email":"aitester@example.com","password":"Password123!","dateOfBirth":"2000-01-01","recaptchaToken":"mock-captcha-token"}'

Start-Sleep -Seconds 2

# We can't easily extract OTP from logs via script, so I will just call login which generates OTP, wait, I need the OTP.
# Actually I can just create a JWT token directly using the backend JWT Provider, but it's easier to just look at logs again.
