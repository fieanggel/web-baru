export default function Home() {
  return (
    <main className="page-enter bg-surface font-body text-on-surface antialiased">
      <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm reveal-up">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="text-xl font-black text-green-700 tracking-tighter font-headline">
            REVOLUSI KELOLA SAMPAH
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-green-700 border-b-2 border-green-700 pb-1 font-medium" href="#hero">
              Solutions
            </a>
            <a
              className="text-slate-600 font-medium hover:text-green-600 transition-colors duration-300"
              href="#technology"
            >
              Technology
            </a>
            <a
              className="text-slate-600 font-medium hover:text-green-600 transition-colors duration-300"
              href="#impact"
            >
              Impact
            </a>
            <a
              className="text-slate-600 font-medium hover:text-green-600 transition-colors duration-300"
              href="#about"
            >
              About Us
            </a>
          </div>
          <div className="flex gap-4 items-center">
            <a className="hidden lg:block text-slate-600 font-medium hover:text-green-600 transition-all" href="/login">
              Login
            </a>
            <a className="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold tracking-tight scale-95 active:duration-100 transition-transform" href="/register">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <header id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Futuristic integrated waste management facility with robotic arms, IoT sensors, and lush greenery in a clean high-tech environment"
            className="w-full h-full object-cover opacity-90"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1ReKhUe5efMDwmJJj1GCN6yQiG_JABo1F-voNFbDuNaSgdQ6Ei0KPTFBWgn_lQCTaNlVPhLU-eWqptbEvXgc2geyBO9t5kCoHsqbCpkEym6o2YE85a-Q1vMfJwdJE1jiA5wIH-efKnP63V1AX5mM92o3k3MlSheTZfLMDaOUelP51iEoQ-1bTX84D4__r6OiiI9gDQVuAnu6E3RmtLe2umMhZgxYCP49_mHm20BfkQ4BNgK319Y0c-qr1ME6FyrsuIsx6URIKAfCm"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/60 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-12">
          <div className="flex flex-col justify-center reveal-up">
            <div className="inline-flex items-center gap-2 bg-primary-container/30 border border-primary/10 px-4 py-1 rounded-full w-fit mb-6 reveal-up delay-1">
              <span className="material-symbols-outlined text-tech-green text-sm">settings_input_antenna</span>
              <span className="text-xs font-bold tracking-widest text-primary uppercase">
                IoT Enabled Eco-System
              </span>
            </div>
            <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface leading-[1.1] mb-6 tracking-tighter reveal-up delay-2">
              REVOLUSI KELOLA SAMPAH: <span className="text-tech-green">BERSIH, PINTAR, BERDAYA</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed font-body reveal-up delay-3">
              Sistem Manajemen Sampah Terintegrasi IoT. Pantau, Pilah, dan Daur Ulang dengan Mudah.
              Transformasi digital untuk masa depan yang lebih hijau.
            </p>
            <div className="flex flex-wrap gap-4 reveal-up delay-4">
              <a className="bg-tech-green text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-tech-green/20 hover:scale-105 transition-transform" href="/register">
                MULAI SEKARANG
              </a>
              <a className="bg-white/80 backdrop-blur px-8 py-4 rounded-xl font-bold text-lg text-on-surface flex items-center gap-2 hover:bg-white transition-all" href="/login">
                <span className="material-symbols-outlined">play_circle</span>
                Lihat Demo
              </a>
            </div>
          </div>
        </div>
      </header>

      <section id="impact" className="py-12 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-24 relative z-20">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/5 card-hover reveal-up">
              <span className="material-symbols-outlined text-tech-green text-4xl mb-4">eco</span>
              <div className="text-4xl font-headline font-black text-on-surface mb-1">12.4K</div>
              <div className="text-on-surface-variant font-medium">Tons Carbon Offset</div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/5 card-hover reveal-up delay-1">
              <span className="material-symbols-outlined text-electric-blue text-4xl mb-4">delete_sweep</span>
              <div className="text-4xl font-headline font-black text-on-surface mb-1">85%</div>
              <div className="text-on-surface-variant font-medium">Waste Diverted from Landfill</div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/5 card-hover reveal-up delay-2">
              <span className="material-symbols-outlined text-tertiary text-4xl mb-4">precision_manufacturing</span>
              <div className="text-4xl font-headline font-black text-on-surface mb-1">200+</div>
              <div className="text-on-surface-variant font-medium">Smart Facilities Active</div>
            </div>
          </div>
        </div>
      </section>

      <section id="technology" className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col mb-16">
            <h2 className="font-headline font-black text-4xl text-on-surface tracking-tighter mb-4">
              Smart Solutions
            </h2>
            <div className="w-24 h-1.5 bg-tech-green rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[600px]">
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-10 flex flex-col justify-end relative overflow-hidden group card-hover reveal-up">
              <div className="absolute top-0 right-0 p-12">
                <span className="material-symbols-outlined text-tech-green text-8xl opacity-10 group-hover:opacity-20 transition-opacity">sensors</span>
              </div>
              <div className="relative z-10">
                <div className="bg-primary-container text-on-primary-container w-fit px-3 py-1 rounded-lg text-xs font-bold mb-4 uppercase tracking-widest">
                  IoT Core
                </div>
                <h3 className="text-3xl font-headline font-extrabold mb-4">IoT Real-Time Monitoring</h3>
                <p className="text-on-surface-variant max-w-md mb-8">
                  Pantau kapasitas tempat sampah secara real-time. Sensor ultrasonik mendeteksi
                  kepenuhan dan mengirim data langsung ke dashboard pusat untuk optimasi rute armada.
                </p>
              </div>
            </div>
            <div className="lg:col-span-4 bg-tech-green text-white rounded-xl p-10 flex flex-col items-center justify-center text-center card-hover reveal-up delay-1">
              <span className="material-symbols-outlined text-7xl mb-6">robot_2</span>
              <h3 className="text-2xl font-headline font-extrabold mb-4">Automated Sorting</h3>
              <p className="opacity-90 font-medium mb-8">
                Teknologi Computer Vision memisahkan sampah organik, anorganik, dan residu secara otomatis dalam hitungan milidetik.
              </p>
              <a className="bg-white text-tech-green px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all" href="/register">
                Explore Tech
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-24 bg-surface-container-low overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="reveal-left">
              <h2 className="font-headline font-black text-4xl text-on-surface tracking-tighter mb-8 leading-tight">
                How Our Smart Bins Work:
                <br />
                <span className="text-tech-green">Efficiency Meets Intelligence</span>
              </h2>
              <p className="text-on-surface-variant">
                Platform ini menghubungkan data lapangan, dashboard analitik, dan partisipasi warga dalam satu alur yang konsisten.
              </p>
            </div>
            <div className="relative bg-surface-container-lowest p-6 rounded-3xl shadow-2xl overflow-hidden card-hover reveal-right delay-1">
              <div className="rounded-2xl w-full min-h-[320px] bg-gradient-to-br from-primary-container/60 via-surface-container-low to-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-tech-green text-9xl float-soft">compost</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
