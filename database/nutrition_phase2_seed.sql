-- Optional demo data. Safe to run more than once; existing food and targets
-- are preserved. Does not create or overwrite astronaut accounts.
INSERT INTO food_inventory (
    item_name, category, calories_kcal, protein_g, carbs_g, fat_g, sodium_mg,
    potassium_mg, calcium_mg, vitamin_d_iu, water_required_ml, stock_quantity
)
SELECT seed.item_name, seed.category, seed.calories_kcal, seed.protein_g, seed.carbs_g,
       seed.fat_g, seed.sodium_mg, seed.potassium_mg, seed.calcium_mg,
       seed.vitamin_d_iu, seed.water_required_ml, seed.stock_quantity
FROM (VALUES
    ('Freeze-Dried Teriyaki Chicken & Rice', 'REHYDRATABLE', 460, 34.0, 52.0, 11.0, 480.0, 620.0, 110.0, 150.0, 220, 84),
    ('Dehydrated Scrambled Eggs with Spinach', 'REHYDRATABLE', 320, 24.0, 6.0, 21.0, 390.0, 450.0, 280.0, 400.0, 150, 92),
    ('Freeze-Dried Lentil Stew', 'REHYDRATABLE', 390, 22.0, 58.0, 7.0, 360.0, 810.0, 90.0, 0.0, 240, 60),
    ('Rehydratable Oatmeal with Blueberries', 'REHYDRATABLE', 280, 10.0, 48.0, 6.0, 180.0, 310.0, 140.0, 80.0, 180, 75),
    ('Freeze-Dried Vegetable Curry', 'REHYDRATABLE', 350, 13.0, 54.0, 9.0, 420.0, 690.0, 130.0, 0.0, 230, 55),
    ('Thermostabilized Beef Pot Roast & Vegetables', 'THERMOSTABILIZED', 380, 29.0, 18.0, 16.0, 410.0, 580.0, 85.0, 120.0, 0, 65),
    ('Omega-3 Fortified Wild Salmon Pouch', 'THERMOSTABILIZED', 310, 32.0, 2.0, 19.0, 380.0, 520.0, 190.0, 650.0, 0, 78),
    ('Thermostabilized Chicken Breast', 'THERMOSTABILIZED', 290, 38.0, 8.0, 11.0, 330.0, 470.0, 35.0, 90.0, 0, 70),
    ('Lentil and Tomato Soup', 'THERMOSTABILIZED', 240, 14.0, 36.0, 4.0, 390.0, 560.0, 70.0, 0.0, 0, 50),
    ('Organic Almond & Cranberry Mix', 'READY_TO_EAT', 290, 8.5, 26.0, 18.0, 95.0, 310.0, 160.0, 80.0, 0, 120),
    ('Whole Wheat Astronaut Tortillas', 'READY_TO_EAT', 240, 7.0, 42.0, 4.0, 210.0, 140.0, 120.0, 0.0, 0, 145),
    ('Calcium-Fortified Fruit Bar', 'READY_TO_EAT', 190, 5.0, 32.0, 5.0, 110.0, 180.0, 240.0, 100.0, 0, 100),
    ('Peanut Butter Spread', 'READY_TO_EAT', 200, 8.0, 7.0, 17.0, 150.0, 210.0, 18.0, 0.0, 0, 90),
    ('Dried Apricot and Pumpkin Seed Mix', 'READY_TO_EAT', 230, 7.0, 29.0, 11.0, 45.0, 520.0, 55.0, 0.0, 0, 85),
    ('Vitamin D Fortified Breakfast Drink', 'READY_TO_EAT', 160, 12.0, 18.0, 4.0, 170.0, 360.0, 300.0, 400.0, 0, 80)
) AS seed(item_name, category, calories_kcal, protein_g, carbs_g, fat_g, sodium_mg,
          potassium_mg, calcium_mg, vitamin_d_iu, water_required_ml, stock_quantity)
WHERE NOT EXISTS (SELECT 1 FROM food_inventory existing);

INSERT INTO daily_nutrition_targets (
    astronaut_id, target_date, target_calories_kcal, target_protein_g,
    target_water_ml, max_sodium_mg, target_calcium_mg, target_vitamin_d_iu, is_eva_day
)
SELECT astronaut.id, CURRENT_DATE, 2800, 110.0, 2500, 2000.0, 1200.0, 1000.0, FALSE
FROM astronauts astronaut
WHERE NOT EXISTS (
    SELECT 1 FROM daily_nutrition_targets target WHERE target.astronaut_id = astronaut.id
);
