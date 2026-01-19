import Link from 'next/link'
import { Coffee, HardHat, Briefcase } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl w-full">
        
        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-2xl mb-4 shadow-2xl">
            <Coffee className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Morning Brew Empire
          </h1>
          <p className="text-lg text-muted-foreground">
            Multi-Location Rostering System
          </p>
        </div>

        {/* ROLE CARDS */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* ADMIN CARD */}
          <Link 
            href="/admin" 
            className="group relative bg-card border-2 border-border rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:border-primary hover:shadow-2xl hover:shadow-primary/20"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Briefcase className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-card-foreground">
                Admin Portal
              </h2>
              <p className="text-muted-foreground">
                Manage schedules, view all locations, and assign shifts across your empire
              </p>
              <div className="pt-4">
                <span className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all">
                  Enter Portal
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* WORKER CARD */}
          <Link 
            href="/worker" 
            className="group relative bg-card border-2 border-border rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:border-primary hover:shadow-2xl hover:shadow-primary/20"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <HardHat className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-card-foreground">
                Worker Portal
              </h2>
              <p className="text-muted-foreground">
                Set your availability, view your schedule, and manage your shifts
              </p>
              <div className="pt-4">
                <span className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-4 transition-all">
                  Enter Portal
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

        </div>

        {/* FOOTER */}
        <div className="mt-12 text-center text-muted-foreground text-sm">
          <p>Multi-tenant SaaS rostering platform • Built with Next.js & Supabase</p>
        </div>

      </div>
    </div>
  )
}