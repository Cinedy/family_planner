-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");

-- CreateIndex
CREATE INDEX "Invitation_familyId_email_idx" ON "Invitation"("familyId", "email");

-- CreateIndex
CREATE INDEX "CalendarEvent_familyId_idx" ON "CalendarEvent"("familyId");

-- CreateIndex
CREATE INDEX "TodoList_familyId_idx" ON "TodoList"("familyId");

-- CreateIndex
CREATE INDEX "TodoItem_listId_idx" ON "TodoItem"("listId");

-- CreateIndex
CREATE INDEX "GroceryList_familyId_idx" ON "GroceryList"("familyId");

-- CreateIndex
CREATE INDEX "GroceryItem_listId_idx" ON "GroceryItem"("listId");

-- CreateIndex
CREATE INDEX "MealPlanEntry_planId_idx" ON "MealPlanEntry"("planId");

-- CreateIndex
CREATE INDEX "Recipe_familyId_idx" ON "Recipe"("familyId");
