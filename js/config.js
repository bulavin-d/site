/**
 * config.js — единый источник Supabase конфига
 * Импортируется как <script src="/js/config.js"> ДО других скриптов
 */

const SUPABASE_URL  = 'https://uhqxtkuriccfimcnchuj.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVocXh0a3VyaWNjZmltY25jaHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTIzNjIsImV4cCI6MjA4NzQyODM2Mn0.juMhRq8oK1xB5gfRuROJur0DuwKqeZpke4ljGQLxYvI';
const ADMIN_EMAIL   = 'bulavka.music@mail.ru';
const STORY_URL_BASE = `${SUPABASE_URL}/storage/v1/object/public/stories/story.mp4`;

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
