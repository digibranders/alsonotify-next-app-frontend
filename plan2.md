1. **Tasks Page Column Alignment:**
   - In `src/components/features/tasks/TasksPage.tsx`: Modify the grid layout `grid-cols-[40px_2fr_1.6fr_0.9fr_0.7fr_1.5fr_0.5fr_40px]` to make checkboxes left-aligned, and fix header elements to be left-aligned (remove flex center, update padding/margins).
   - In `src/components/features/tasks/rows/TaskRow.tsx`: Change the Checkbox wrapper from `flex justify-center` to `flex items-center`. Remove center alignments from other columns to make them left-aligned.
2. **Reduce Spacing below Table Header:**
   - In `src/components/features/tasks/TasksPage.tsx`: Change `mb-2` to `mb-0` on the table header `div className="sticky top-0 z-20...`.
3. **Tab Titles Font Size:**
   - Modify `src/components/layout/PageLayout.tsx` tab titles to have `text-[0.875rem]`.
   - Modify `src/components/ui/PillTabs.tsx` to have `text-[0.875rem]`.
4. **Profile Picture Background Color:**
   - In `src/components/dashboard/MeetingsWidget.tsx`: Change the avatar background in lines ~488 from `bg-gradient-to-br from-[#ff3b3b] to-[#ff6b6b]` to `bg-[#E5E5E5]` and update the text color inside to `#666666`. Also change `isRedDate` logic if needed for the overflow count.
   - In `src/components/common/Topbar.tsx`: Change `<Avatar>` background color from `#ff3b3b` to `#E5E5E5` and `color` to `#666666`.
