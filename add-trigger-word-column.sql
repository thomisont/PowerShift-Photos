-- Check if column exists, and add it if not
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lora_models' 
        AND column_name = 'trigger_word'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.lora_models ADD COLUMN trigger_word TEXT;
        RAISE NOTICE 'Column added';
    ELSE
        RAISE NOTICE 'Column already exists';
    END IF;
END
$$;

-- Set the trigger word for the Better Than Headshots model
UPDATE lora_models 
SET trigger_word = 'BTHEADSHOTS' 
WHERE replicate_id = 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da';

-- Verify it was updated
SELECT id, name, trigger_word FROM lora_models 
WHERE replicate_id = 'thomisont/betterthanheadshots-tjt:dd5079e7b7dcb7f898913226632c39419fe81762f08f960fb869cb954891d7da'; 