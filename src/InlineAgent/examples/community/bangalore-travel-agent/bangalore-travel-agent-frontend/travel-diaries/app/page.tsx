import Image from "next/image";
import Link from "next/link";
import ChatBotWrapper from "../components/ChatBotWrapper";
import { foodSpots, placesToVisit, localExperiences } from "../data/bangaloreData";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#192841] via-[#2d1f41] to-[#341c3b] text-white">
      {/* ChatBot Component */}
      <ChatBotWrapper />
      

      {/* Hero Section */}
      <div className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/bangalore-skyline.png" 
            alt="Mountain Landscape"
            width={1920}
            height={1080}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#192841]/30 to-[#2d1f41]/70 mix-blend-multiply"></div>
        </div>
        <div className="z-10 text-center px-4 mt-20">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tight">
            BANGALORE <span className="bg-gradient-to-r from-pink-500 to-red-600 text-transparent bg-clip-text">DIARIES</span>
          </h1>
          <div className="inline-block max-w-3xl">
            <p className="text-2xl md:text-3xl text-white mb-10 leading-relaxed font-bold" style={{fontFamily: "var(--font-dancing-script)"}}>
              Explore Bangalore's hidden gems, delicious food, & vibrant culture
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative">
        {/* Featured Section */}
        <section className="pt-24 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                <span className="relative">
                  Best Places
                  <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#ff6b6b]"></span>
                </span>
              </h2>
              <p className="text-[#a3b1cc] font-medium">Trending Bangalore</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="col-span-1 lg:col-span-2 row-span-2 relative rounded-2xl overflow-hidden group">
                <Image 
                  src="/cherry-blossom.jpg" 
                  alt="Bangalore Palace" 
                  width={800} 
                  height={600}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1321] via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6">
                  <span className="bg-[#ff6b6b] text-white text-sm px-3 py-1 rounded-full mb-3 inline-block">Featured</span>
                  <h3 className="text-2xl font-bold text-white mb-2">Its Spring Time</h3>
                  <p className="text-white/80 mb-4">Experience the magical pink canopy of cherry blossoms at Bangalore's parks and botanical gardens during the spring bloom.</p>
                  <div className="flex items-center text-white/70 text-sm">
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/10 backdrop-blur-sm p-2 rounded-full">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {foodSpots.slice(0, 2).map((spot) => (
                <div key={spot.id} className="relative rounded-2xl overflow-hidden group h-72">
                  <Image 
                    src={spot.image} 
                    alt={spot.name}
                    width={400}
                    height={300}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1321] via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6">
                    <span className="bg-[#3a86ff] text-white text-sm px-3 py-1 rounded-full mb-3 inline-block">Food</span>
                    <h3 className="text-xl font-bold text-white mb-2">{spot.name}</h3>
                    <p className="text-white/80 mb-2">{spot.description}</p>
                    <div className="text-white/70 text-sm">{spot.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* World Map Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-[#2d1f41] to-[#1c1332]">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-10">Discover the world through</h2>
            <div className="mb-16 relative">
              <Image 
                src="/world-map.png" 
                alt="World Map" 
                width={1200} 
                height={600}
                className="mx-auto"
              />
              
              {/* Map Markers */}
              <div className="absolute left-[20%] top-[30%] animate-pulse">
                <div className="w-3 h-3 bg-[#ff6b6b] rounded-full"></div>
              </div>
              <div className="absolute left-[50%] top-[25%] animate-pulse">
                <div className="w-3 h-3 bg-[#ff6b6b] rounded-full"></div>
              </div>
              <div className="absolute left-[75%] top-[40%] animate-pulse">
                <div className="w-3 h-3 bg-[#ff6b6b] rounded-full"></div>
              </div>
              <div className="absolute left-[60%] top-[60%] animate-pulse">
                <div className="w-3 h-3 bg-[#3a86ff] rounded-full"></div>
              </div>
              <div className="absolute left-[30%] top-[65%] animate-pulse">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{background: 'rgba(255, 107, 107, 0.2)'}}>
                  <div className="w-3 h-3 bg-[#ff6b6b] rounded-full"></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-8 mb-8">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#ff6b6b] rounded-full mr-2"></div>
                <span className="text-white/80">Popular</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#3a86ff] rounded-full mr-2"></div>
                <span className="text-white/80">New</span>
              </div>
            </div>
            
            <button className="bg-[#1a2332] text-white px-8 py-3 rounded-md font-medium hover:bg-[#273549] transition-colors inline-flex items-center">
              <span>View all trails</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </section>
        
        {/* Places to Visit */}
        <section className="py-24 px-4 relative bg-[#341c3b] overflow-hidden">
          {/* Mountain Silhouette Background */}
          <div className="absolute bottom-0 left-0 w-full opacity-30">
            <Image 
              src="/mountain-silhouette.png" 
              alt="Mountain Silhouette" 
              width={1920}
              height={300}
              className="w-full"
            />
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                <span className="relative">
                  Top Attractions
                  <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#ff6b6b]"></span>
                </span>
              </h2>
              <p className="text-[#a3b1cc] font-medium">Explore Bangalore</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {placesToVisit.map((place) => (
                <div key={place.id} className="bg-[#1a2332]/70 backdrop-blur-sm rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-300 border border-white/5">
                  <div className="h-48 relative">
                    <Image 
                      src={place.image} 
                      alt={place.name}
                      width={400}
                      height={300}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <div className="absolute top-0 right-0 p-3">
                      <div className="bg-white/10 backdrop-blur-sm p-2 rounded-full">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-semibold text-white mb-2">{place.name}</h3>
                    <p className="text-[#ff6b6b] text-sm mb-3">{place.timing}</p>
                    <p className="text-white/80">{place.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Local Experiences */}
        <section className="py-24 px-4 bg-[#1c1332]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                <span className="relative">
                  Local Experiences
                  <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#ff6b6b]"></span>
                </span>
              </h2>
              <p className="text-[#a3b1cc] font-medium">Live like a Bangalorean</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {localExperiences.map((exp) => (
                <div key={exp.id} className="rounded-xl overflow-hidden group relative">
                  <div className="h-72 relative">
                    <Image 
                      src={exp.image} 
                      alt={exp.name}
                      width={500}
                      height={350}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      className="group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1321] to-transparent"></div>
                  </div>
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <h3 className="text-xl font-bold text-white mb-2">{exp.name}</h3>
                    <p className="text-white/80">{exp.description}</p>
                    <button className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md backdrop-blur-sm transition-colors inline-flex items-center">
                      <span>View details</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* About Section with Hiker */}
      <section className="py-24 px-4 bg-[#2d1f41] relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-1/2 opacity-80">
          <Image 
            src="/hiker-illustration.png" 
            alt="Hiker" 
            width={600}
            height={600}
          />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              <span className="relative inline-block">
                About Us
                <span className="absolute -bottom-2 left-1/4 right-1/4 w-1/2 h-1 bg-[#ff6b6b]"></span>
              </span>
            </h2>
            <p className="text-white/80 mb-6 text-lg">Bangalore TRAILS is your ultimate companion for discovering the hidden gems of the Garden City. Whether you're looking for culinary delights, historical landmarks, or unique local experiences, we've got you covered.</p>
            <p className="text-white/80 mb-10">Our team of local experts has curated the best experiences that Bangalore has to offer, ensuring that you get an authentic taste of the city's rich culture and vibrant lifestyle.</p>
            <button className="bg-[#ff6b6b] hover:bg-[#ff5252] text-white px-6 py-3 rounded-md font-medium transition-colors inline-flex items-center mx-auto">
              <span>Learn more about us</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Popular Trails Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-[#1c1332] to-[#341c3b]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
            The most popular trails
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-700 rounded-xl overflow-hidden relative group cursor-pointer">
              <Image 
                src="/trail-card-1.jpg" 
                alt="Trail 1" 
                width={300}
                height={400}
                className="w-full h-full object-cover mix-blend-overlay group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-end p-4">
                <div>
                  <h3 className="text-white font-bold">Cubbon Park</h3>
                  <div className="flex items-center">
                    <span className="text-white/80 text-sm">4.8</span>
                    <div className="flex ml-1">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-pink-700 rounded-xl overflow-hidden relative group cursor-pointer">
              <Image 
                src="/trail-card-2.jpg" 
                alt="Trail 2" 
                width={300}
                height={400}
                className="w-full h-full object-cover mix-blend-overlay group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-end p-4">
                <div>
                  <h3 className="text-white font-bold">MTR Experience</h3>
                  <div className="flex items-center">
                    <span className="text-white/80 text-sm">4.7</span>
                    <div className="flex ml-1">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-700 rounded-xl overflow-hidden relative group cursor-pointer">
              <Image 
                src="/trail-card-3.jpg" 
                alt="Trail 3" 
                width={300}
                height={400}
                className="w-full h-full object-cover mix-blend-overlay group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-end p-4">
                <div>
                  <h3 className="text-white font-bold">ISKCON Temple</h3>
                  <div className="flex items-center">
                    <span className="text-white/80 text-sm">4.9</span>
                    <div className="flex ml-1">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-700 rounded-xl overflow-hidden relative group cursor-pointer">
              <Image 
                src="/trail-card-4.jpg" 
                alt="Trail 4" 
                width={300}
                height={400}
                className="w-full h-full object-cover mix-blend-overlay group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-end p-4">
                <div>
                  <h3 className="text-white font-bold">Nandi Hills</h3>
                  <div className="flex items-center">
                    <span className="text-white/80 text-sm">4.6</span>
                    <div className="flex ml-1">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl overflow-hidden relative group cursor-pointer">
              <Image 
                src="/trail-card-5.jpg" 
                alt="Trail 5" 
                width={300}
                height={400}
                className="w-full h-full object-cover mix-blend-overlay group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-end p-4">
                <div>
                  <h3 className="text-white font-bold">Wonderla</h3>
                  <div className="flex items-center">
                    <span className="text-white/80 text-sm">4.5</span>
                    <div className="flex ml-1">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-12">
            <div className="inline-flex items-center gap-2">
              <button className="w-3 h-3 rounded-full bg-white opacity-50"></button>
              <button className="w-3 h-3 rounded-full bg-white"></button>
              <button className="w-3 h-3 rounded-full bg-white opacity-50"></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
