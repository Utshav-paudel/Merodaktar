# MeroDaktar v2 - AI-Powered Medical Platform

A comprehensive medical consultation and appointment management platform with AI-powered chat, Electronic Health Records (EHR), and separate portals for patients and doctors.

## 🌟 Features

### Patient Portal
- **AI Medical Chat**: Get instant health advice with voice support (turn on/off)
- **Appointment Booking**: Schedule appointments with doctors
- **Electronic Health Records (EHR)**: Comprehensive health records management
  - Vital Signs tracking with visualization
  - Medications management
  - Allergies tracking
  - Medical History
  - Lab Results (coming soon)
  - Immunization records (coming soon)
- **Dashboard**: Overview of health metrics, consultations, and appointments
- **Multi-Factor Authentication**: Enhanced security for patient accounts

### Doctor Portal
- **Doctor Dashboard**: Comprehensive overview of practice
  - Today's appointments
  - Patient statistics
  - Appointment management
- **Patient Management**: View all patients and their appointment history
- **Medical Notes**: Add diagnosis, prescriptions, and follow-up notes to appointments
- **Appointment Status Management**: Update appointment status (confirmed, completed, cancelled, no-show)
- **Specialty-based Registration**: Doctors register with their specialization

### Core Features
- **JWT Authentication**: Secure token-based authentication for both patients and doctors
- **Voice-Enabled AI Chat**: Toggle voice on/off for AI responses using browser's speech synthesis
- **Real-time Updates**: Instant updates for appointments and health records
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to the project root**:
   ```powershell
   cd d:\merodaktarv2
   ```

2. **Activate virtual environment** (if using one):
   ```powershell
   .\md\Scripts\Activate.ps1
   ```

3. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   - Copy `app\.env.example` to `app\.env`
   - Add your OpenAI API key
   - (Optional) Add Gemini API key for future voice features
   ```powershell
   Copy-Item app\.env.example app\.env
   ```

5. **Run the backend server**:
   ```powershell
   cd app
   python main.py
   ```
   The backend will run on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Run the development server**:
   ```powershell
   npm run dev
   ```
   The frontend will run on `http://localhost:5176`

## 📱 Usage

### Patient Access
1. Go to `http://localhost:5176/login`
2. Register as a new patient or login
3. Access features:
   - **Dashboard**: View health overview
   - **AI Chat**: Click on "AI Medical Chat" and toggle voice on/off in the header
   - **Appointments**: Book and manage appointments
   - **Health Records**: Click "My Health Records" to view/add EHR data

### Doctor Access
1. Go to `http://localhost:5176/doctor/login`
2. Register as a doctor (include specialization)
3. Access features:
   - **Dashboard**: View statistics and today's appointments
   - **Appointments Tab**: Manage all appointments
   - **Patients Tab**: View patient list
   - **Add Notes**: Click on any appointment to add medical notes

## 🎯 Key Endpoints

### Patient API Endpoints
- `POST /api/register` - Patient registration
- `POST /api/token` - Patient login
- `GET /api/verify` - Verify JWT token
- `POST /api/medical/chat` - AI medical consultation
- `GET /api/appointments/my-appointments` - Get patient appointments
- `POST /api/appointments/book` - Book appointment
- `GET /api/patient/ehr/` - Get complete EHR
- `POST /api/patient/ehr/vital-signs` - Add vital signs
- `POST /api/patient/ehr/medications` - Add medication
- `POST /api/patient/ehr/allergies` - Add allergy

### Doctor API Endpoints
- `POST /api/doctor/register` - Doctor registration
- `POST /api/doctor/token` - Doctor login
- `GET /api/doctor/profile` - Get doctor profile
- `GET /api/doctor/dashboard/stats` - Get dashboard statistics
- `GET /api/doctor/dashboard/appointments` - Get all appointments
- `GET /api/doctor/dashboard/appointments/today` - Get today's appointments
- `PUT /api/doctor/dashboard/appointments/{id}/notes` - Add medical notes
- `PUT /api/doctor/dashboard/appointments/{id}/status` - Update appointment status
- `GET /api/doctor/dashboard/patients` - Get patient list

## 🎨 Voice Feature

The AI chat includes a voice toggle feature:
- Click the **Voice ON/OFF** button in the chat header
- When enabled, AI responses will be spoken using browser's text-to-speech
- Click the stop button (when speaking) to interrupt speech
- Toggle off to return to text-only mode

**Note**: Voice uses browser's built-in speech synthesis. No external API required for this feature.

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Separate authentication for patients and doctors
- Token expiration (30 minutes for patients, 8 hours for doctors)
- Multi-Factor Authentication (MFA) support

## 📊 Technologies Used

### Backend
- **FastAPI**: Modern Python web framework
- **OpenAI API**: GPT-4 for medical consultations
- **JWT**: Secure authentication
- **Pydantic**: Data validation
- **CORS**: Cross-origin resource sharing

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool
- **React Router**: Client-side routing
- **Heroicons**: Beautiful icons
- **Browser Speech API**: Text-to-speech for voice feature

## 🗂️ Project Structure

```
merodaktarv2/
├── app/
│   ├── main.py                      # FastAPI application entry
│   ├── .env                         # Environment variables
│   └── subapps/
│       ├── login_verification/
│       │   └── auth.py              # Patient authentication
│       ├── doctor/
│       │   ├── doctor_auth.py       # Doctor authentication
│       │   └── doctor_dashboard.py  # Doctor dashboard logic
│       ├── patient/
│       │   └── ehr.py               # Electronic Health Records
│       ├── appointment/
│       │   └── appointments.py      # Appointment management
│       ├── dashboard/
│       │   └── dashboard.py         # Patient dashboard
│       └── medical_chat/
│           └── chat.py              # AI medical chat
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main app component
│   │   └── components/
│   │       ├── Login.tsx            # Patient login
│   │       ├── DoctorLogin.tsx      # Doctor login
│   │       ├── Dashboard.tsx        # Patient dashboard
│   │       ├── DoctorDashboard.tsx  # Doctor dashboard
│   │       ├── PatientEHR.tsx       # EHR component
│   │       ├── MedicalChat.tsx      # AI chat with voice
│   │       └── Appointments.tsx     # Appointments
│   ├── package.json
│   └── vite.config.ts
└── requirements.txt                 # Python dependencies
```

## 🎯 Future Enhancements

- [ ] Voice input for medical chat (speech-to-text)
- [ ] Gemini API integration for advanced voice features
- [ ] Real-time video consultations
- [ ] Prescription generation and printing
- [ ] Lab results integration
- [ ] Appointment reminders via email/SMS
- [ ] Multi-language support (Nepali)
- [ ] Payment integration
- [ ] Medical report uploads
- [ ] Chat history export
- [ ] Calendar integration for doctors
- [ ] Advanced health visualizations with charts

## 🐛 Troubleshooting

### Backend Issues
- **Port already in use**: Change port in `main.py` (default: 8000)
- **OpenAI API errors**: Check API key in `.env` file
- **Import errors**: Ensure all dependencies are installed: `pip install -r requirements.txt`

### Frontend Issues
- **Port conflict**: Change port in `vite.config.ts` (default: 5176)
- **API connection errors**: Ensure backend is running on port 8000
- **Voice not working**: Check browser compatibility (Chrome/Edge recommended)

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🤝 Contributing

This is a demonstration project. For production use:
1. Use a proper database (PostgreSQL, MySQL)
2. Add comprehensive error handling
3. Implement rate limiting
4. Add logging and monitoring
5. Secure API keys properly
6. Add unit and integration tests
7. Implement proper session management

## 📄 License

This project is for educational and demonstration purposes.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- FastAPI framework
- React and Vite communities
- Tailwind CSS team

---

**Note**: This application provides medical information for educational purposes only and should not replace professional medical advice. Always consult with qualified healthcare providers for medical decisions.
