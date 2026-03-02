'use strict';

/**
 * SGE — Supabase Configuration
 * Initializes the Supabase client for the application.
 */
window.SGE = window.SGE || {};

// Replace with your actual Supabase credentials
// URL: Found in Project Settings -> API
// KEY: Found in Project Settings -> API (anon public kye)
SGE.SUPABASE_URL = 'https://mgcjidryrjqiceielmzp.supabase.co';
SGE.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nY2ppZHJ5cmpxaWNlaWVsbXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEwNzEsImV4cCI6MjA4NzY5NzA3MX0.UAKkzy5fMIkrlmnqz9E9KknUw9xhoYpa3f1ptRpOuAA';

if (SGE.SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SGE.SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    window.supabase = supabase.createClient(SGE.SUPABASE_URL, SGE.SUPABASE_KEY);
    console.info('SGE: Supabase client initialized.');
} else {
    console.warn('SGE: Supabase credentials not set. Please update js/supabase-config.js');
}
