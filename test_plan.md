1. **Tasks Page Column Alignment:**
   - In `src/components/features/tasks/TasksPage.tsx`: Modify the grid layout `grid-cols-[40px_2fr_1.6fr_0.9fr_0.7fr_1.5fr_0.5fr_40px]` to make checkboxes left-aligned, and fix header elements to be left-aligned (remove flex center, update padding/margins).
   - In `src/components/features/tasks/rows/TaskRow.tsx`: Update the `grid-cols` values correspondingly if needed, and change the Checkbox wrapper from `flex justify-center` to `flex items-center`. Ensure other columns (Avatar stack, Status badge, etc.) are left-aligned as well.
2. **Reduce Spacing below Table Header:**
   - In `src/components/features/tasks/TasksPage.tsx`: Look for `mb-2` or `pb-X` on the table header or `mt-X` on the list below it, and reduce the spacing. Currently `mb-2` is on the header `div className="sticky top-0 z-20... mb-2"`. I'll remove or reduce `mb-2` and check for other spacing.
3. **Tab Titles Font Size:**
   - The user wants tab titles to be `14px` in `rem` units (which is `0.875rem`).
   - In `src/components/layout/PageLayout.tsx`: `text-sm` is used for tabs (which is already `0.875rem`). Wait, let me check `src/components/ui/PillTabs.tsx` - it uses `text-sm`. If it's already `text-sm`, let's explicitly set `text-[0.875rem]` to be sure, or check if the user meant something else.
4. **Profile Picture Background Color:**
   - In `src/components/dashboard/MeetingsWidget.tsx`: Locate the profile avatars and change `bg-red` (or `bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b]`) to a gray color (`bg-[#E5E5E5]` or similar).
   - In `src/components/common/Topbar.tsx`: Locate the Avatar and change its background color to gray.
