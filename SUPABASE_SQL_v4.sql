-- ================================================================
-- BULAVIN.SPACE v4 — SQL для Supabase SQL Editor
-- Выполни один раз. Ничего существующего не ломает.
-- ================================================================

-- 1. Бакет AVATARS (для аватарок)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Бакет COMMUNITY_PHOTOS (для секретной галереи)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community_photos', 'community_photos', true,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Таблица community_photos
CREATE TABLE IF NOT EXISTS public.community_photos (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email        text,
    username     text,
    image_url    text NOT NULL,
    storage_path text,
    created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.community_photos ENABLE ROW LEVEL SECURITY;

-- Все авторизованные могут читать
CREATE POLICY "Anyone can view community_photos"
    ON public.community_photos FOR SELECT TO public USING (true);

-- Авторизованный юзер добавляет только своё
CREATE POLICY "Users can insert own photos"
    ON public.community_photos FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Только ты (admin) удаляет всё
CREATE POLICY "Admin can delete community_photos"
    ON public.community_photos FOR DELETE TO authenticated
    USING (auth.uid() = 'a616987b-a33e-4606-a64d-14c51e1bba80');

-- 4. Политики Storage для AVATARS
CREATE POLICY "Public can view avatars"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "Admin can manage avatars"
    ON storage.objects FOR ALL TO authenticated
    USING     (bucket_id = 'avatars' AND auth.uid() = 'a616987b-a33e-4606-a64d-14c51e1bba80')
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = 'a616987b-a33e-4606-a64d-14c51e1bba80');

-- 5. Политики Storage для COMMUNITY_PHOTOS
CREATE POLICY "Public can view community photo files"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'community_photos');

CREATE POLICY "Auth users can upload community photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'community_photos');

CREATE POLICY "Admin can delete community photo files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'community_photos' AND auth.uid() = 'a616987b-a33e-4606-a64d-14c51e1bba80');

-- ================================================================
-- ГОТОВО. Триггеры, Telegram-бот, site_content — не тронуты.
-- ================================================================
