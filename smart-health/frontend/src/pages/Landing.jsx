import { Link } from 'react-router-dom';
import { SECTORS } from '../utils/helpers';

const SECTOR_ICONS = { hospital:'🏥', clinic:'🩺', diagnostics:'🔬', dental:'🦷', eye_care:'👁️', mental_health:'🧠', ent:'👂' };

const STATS = [
  { value: '500+', label: 'Healthcare Centers' },
  { value: '2,000+', label: 'Doctors' },
  { value: '1M+', label: 'Appointments Booked' },
  { value: '4.8★', label: 'Average Rating' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '📍', title: 'Find a Center', desc: 'Search nearby hospitals, clinics, and specialists using your live location.' },
  { step: '02', icon: '👨‍⚕️', title: 'Choose a Doctor', desc: 'Browse doctor profiles, specializations, and available time slots.' },
  { step: '03', icon: '📅', title: 'Book Instantly', desc: 'Select your preferred date and time. Get instant confirmation.' },
  { step: '04', icon: '⏱️', title: 'Track Your Queue', desc: 'Monitor your live queue position and estimated wait time in real-time.' },
];

const TESTIMONIALS = [
  { name: 'Priya M.', city: 'Bangalore', text: 'Booked a cardiology appointment at 11 PM for the next morning. The 24/7 slots are a game changer!', rating: 5 },
  { name: 'Rahul K.', city: 'Mumbai', text: 'The live queue tracker saved me from waiting 2 hours at the hospital. I arrived just in time.', rating: 5 },
  { name: 'Sneha R.', city: 'Chennai', text: 'Found a dentist 1.2 km from my home in seconds. Booked and confirmed within a minute.', rating: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 backdrop-blur-sm">
              🟢 24/7 Appointments Available
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Health, <br />
              <span className="text-blue-200">On Your Schedule</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl leading-relaxed">
              Book appointments at top hospitals and clinics near you. Track live queue positions, get real-time wait estimates, and never waste time in waiting rooms again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/centers" className="bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors text-center shadow-lg">
                🔍 Find Centers Near Me
              </Link>
              <Link to="/signup" className="border-2 border-white/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-center backdrop-blur-sm">
                Create Free Account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-blue-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sectors */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Browse by Specialty</h2>
            <p className="text-gray-500 mt-2">Find the right care for every health need</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SECTORS.map((s) => (
              <Link
                key={s.value}
                to={`/centers?sector=${s.value}`}
                className="card text-center hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{SECTOR_ICONS[s.value]}</div>
                <p className="text-sm font-semibold">{s.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-gray-500 mt-2">Book your appointment in under 2 minutes</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-blue-100 dark:bg-blue-900" />
            {HOW_IT_WORKS.map((h) => (
              <div key={h.step} className="text-center relative">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border-2 border-blue-100 dark:border-blue-800">
                  {h.icon}
                </div>
                <span className="text-xs font-bold text-blue-400 tracking-widest">STEP {h.step}</span>
                <h3 className="font-semibold text-lg mt-1 mb-2">{h.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">Why SmartHealth?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🕐', title: '24/7 Booking', desc: 'Book appointments any time of day or night. Emergency slots available round the clock.' },
              { icon: '📍', title: 'Real-Time Location', desc: 'Auto-detects your location to show the nearest centers sorted by distance.' },
              { icon: '⏱️', title: 'Live Queue Tracking', desc: 'Know exactly how many patients are ahead and your estimated wait time.' },
              { icon: '🔔', title: 'Smart Reminders', desc: 'Get email reminders before your appointment so you never miss one.' },
              { icon: '🏥', title: '15+ Specialties', desc: 'From general medicine to psychiatry — all healthcare needs in one platform.' },
              { icon: '🔒', title: 'Secure & Private', desc: 'Your health data is encrypted and never shared without your consent.' },
            ].map((f) => (
              <div key={f.title} className="card hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">What Patients Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card">
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, i) => <span key={i} className="text-yellow-400">★</span>)}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take control of your health?</h2>
        <p className="text-blue-100 mb-8 text-lg">Join over 1 million patients who book smarter with SmartHealth.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup" className="bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
            Get Started — It's Free
          </Link>
          <Link to="/centers" className="border-2 border-white/60 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
            Browse Centers
          </Link>
        </div>
        <p className="mt-8 text-blue-200 text-sm">
          Are you a healthcare provider?{' '}
          <Link to="/admin/login" className="text-white font-semibold underline hover:text-blue-100">
            👑 Admin Portal →
          </Link>
        </p>
      </section>
    </div>
  );
}
