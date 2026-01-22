-- Add delete policies for classes and class_students (admin only)

DROP POLICY IF EXISTS "classes_delete_admin" ON public.classes;
CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "class_students_delete_admin" ON public.class_students;
CREATE POLICY "class_students_delete_admin" ON public.class_students
  FOR DELETE USING (public.is_admin());
