-- Allow deleting classes that have topics by cascading

ALTER TABLE public.topics
  DROP CONSTRAINT IF EXISTS topics_class_id_fkey;

ALTER TABLE public.topics
  ADD CONSTRAINT topics_class_id_fkey
  FOREIGN KEY (class_id)
  REFERENCES public.classes(id)
  ON DELETE CASCADE;
