/**
 * Global Types for DR.Pathao
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: 'patient' | 'admin' | 'provider' | 'lab';
  providerType?: 'doctor' | 'nurse' | 'pharmacist' | 'lab' | 'physiotherapist' | 'psychologist';
  providerInfo?: {
    specialty?: string;
    qualification?: string;
    experience?: number;
    consultationFee?: number;
    bio?: string;
    isVerified?: boolean;
    available?: boolean;
    clinicName?: string;
    licenseNumber?: string;
    services?: string[];
    // Specialized fields
    education?: string;
    affiliatedHospitals?: string[];
    companyRegNumber?: string;
    technicianDetails?: {
      name: string;
      licenseId: string;
    };
  };
  dob?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  address?: string;
  location?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  emergencyContact?: {
    name: string;
    phone: string;
  };
  onboardingComplete?: boolean;
  phoneVerified?: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  experience: number;
  rating: number;
  consultationFee: number;
  available: boolean;
  avatar: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  type: 'medication' | 'vaccination' | 'cycle' | 'appointment' | 'followup';
  time: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  active: boolean;
  notes?: string;
  dosage?: string;
  taken?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO format (YYYY-MM-DD)
  time?: string; // Optional time (HH:mm)
  type: 'public' | 'personal';
  category: 'health_day' | 'appointment' | 'medication' | 'cycle' | 'alert' | 'vaccination' | 'screening' | 'lab_test';
  description?: string;
  location?: string;
  status?: 'pending' | 'completed' | 'skipped';
  // Virtual fields for reminders
  isReminder?: boolean;
  reminderId?: string;
  // Specific fields for different categories
  medicationInfo?: {
    dosage: string;
    instructions?: string;
  };
  cycleInfo?: {
    day: number;
    phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
  };
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  userId: string;
  userName: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: any;
  fee: number;
  type: 'tele' | 'home';
  preferredDate?: string;
  preferredTime?: string;
  bookingOption?: 'scheduled' | 'asap' | 'queue';
  location?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  userPhone?: string;
  notes?: string;
}
