-- This script deletes all test images with placekitten URLs
-- Run this in the Supabase SQL Editor to clean up test images

-- First, see what we'll be deleting
SELECT id, title, image_url 
FROM images 
WHERE image_url LIKE 'https://placekitten.com%';

-- Then delete them (uncomment to run)
-- DELETE FROM favorites WHERE image_id IN (
--   SELECT id FROM images WHERE image_url LIKE 'https://placekitten.com%'
-- );

-- DELETE FROM images WHERE image_url LIKE 'https://placekitten.com%';

-- Confirm that they're gone
-- SELECT id, title, image_url 
-- FROM images 
-- WHERE image_url LIKE 'https://placekitten.com%'; 