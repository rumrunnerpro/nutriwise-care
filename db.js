/* NutriCare — Seed data. Runs once on first load. */
(function () {
  'use strict';

  const SEED_FOODS = [
    {
      id: 'f_milk_whole', name: 'Whole Milk', brand: null, emoji: '🥛',
      servingSize: 1, servingUnit: 'cup (244ml)', custom: false,
      nutrients: {
        calories:149, protein:8, carbs:12, fat:8, fiber:0,
        calcium:276, vitaminD:3.2, vitaminK:0.5, magnesium:24, phosphorus:205,
        omega3dha:0, omega3epa:0, choline:35, b12:1.1, folate:12, zinc:0.9,
        potassium:322, sodium:105, vitaminC:0, iron:0.1
      }
    },
    {
      id: 'f_yogurt_greek', name: 'Greek Yogurt, Plain', brand: null, emoji: '🫙',
      servingSize: 1, servingUnit: 'cup (227g)', custom: false,
      nutrients: {
        calories:130, protein:22, carbs:9, fat:0, fiber:0,
        calcium:250, vitaminD:0, vitaminK:0.5, magnesium:19, phosphorus:245,
        omega3dha:0, omega3epa:0, choline:34, b12:1.3, folate:17, zinc:1.1,
        potassium:282, sodium:68, vitaminC:0, iron:0.1
      }
    },
    {
      id: 'f_salmon', name: 'Salmon, Atlantic (cooked)', brand: null, emoji: '🐟',
      servingSize: 1, servingUnit: 'serving (85g / 3oz)', custom: false,
      nutrients: {
        calories:177, protein:17, carbs:0, fat:11, fiber:0,
        calcium:12, vitaminD:14.2, vitaminK:0.5, magnesium:31, phosphorus:274,
        omega3dha:1238, omega3epa:349, choline:93, b12:3.2, folate:28, zinc:0.6,
        potassium:534, sodium:50, vitaminC:0, iron:0.4
      }
    },
    {
      id: 'f_sardines', name: 'Sardines, canned in oil', brand: null, emoji: '🐠',
      servingSize: 1, servingUnit: 'can (106g)', custom: false,
      nutrients: {
        calories:191, protein:23, carbs:0, fat:11, fiber:0,
        calcium:351, vitaminD:4.5, vitaminK:2.6, magnesium:36, phosphorus:451,
        omega3dha:433, omega3epa:403, choline:75, b12:8.9, folate:10, zinc:1.2,
        potassium:365, sodium:465, vitaminC:0, iron:2.7
      }
    },
    {
      id: 'f_egg', name: 'Egg, large', brand: null, emoji: '🥚',
      servingSize: 1, servingUnit: 'egg (50g)', custom: false,
      nutrients: {
        calories:72, protein:6, carbs:0, fat:5, fiber:0,
        calcium:28, vitaminD:1.1, vitaminK:0.1, magnesium:6, phosphorus:99,
        omega3dha:37, omega3epa:0, choline:147, b12:0.6, folate:24, zinc:0.6,
        potassium:69, sodium:71, vitaminC:0, iron:0.9
      }
    },
    {
      id: 'f_spinach', name: 'Spinach, raw', brand: null, emoji: '🥬',
      servingSize: 1, servingUnit: 'cup (30g)', custom: false,
      nutrients: {
        calories:7, protein:1, carbs:1, fat:0, fiber:1,
        calcium:30, vitaminD:0, vitaminK:145, magnesium:24, phosphorus:15,
        omega3dha:0, omega3epa:0, choline:5, b12:0, folate:58, zinc:0.2,
        potassium:167, sodium:24, vitaminC:8.4, iron:0.8
      }
    },
    {
      id: 'f_broccoli', name: 'Broccoli, cooked', brand: null, emoji: '🥦',
      servingSize: 1, servingUnit: 'cup chopped (156g)', custom: false,
      nutrients: {
        calories:55, protein:4, carbs:11, fat:1, fiber:5.1,
        calcium:62, vitaminD:0, vitaminK:220, magnesium:33, phosphorus:105,
        omega3dha:0, omega3epa:0, choline:63, b12:0, folate:168, zinc:0.7,
        potassium:457, sodium:64, vitaminC:101, iron:1.0
      }
    },
    {
      id: 'f_sweet_potato', name: 'Sweet Potato, baked', brand: null, emoji: '🍠',
      servingSize: 1, servingUnit: 'medium (130g)', custom: false,
      nutrients: {
        calories:112, protein:2, carbs:26, fat:0, fiber:3.8,
        calcium:43, vitaminD:0, vitaminK:2.3, magnesium:33, phosphorus:62,
        omega3dha:0, omega3epa:0, choline:13, b12:0, folate:6, zinc:0.4,
        potassium:541, sodium:72, vitaminC:19.6, iron:0.8
      }
    },
    {
      id: 'f_banana', name: 'Banana, medium', brand: null, emoji: '🍌',
      servingSize: 1, servingUnit: 'medium (118g)', custom: false,
      nutrients: {
        calories:105, protein:1, carbs:27, fat:0, fiber:3.1,
        calcium:6, vitaminD:0, vitaminK:0.6, magnesium:32, phosphorus:26,
        omega3dha:0, omega3epa:0, choline:11, b12:0, folate:24, zinc:0.2,
        potassium:422, sodium:1, vitaminC:10.3, iron:0.3
      }
    },
    {
      id: 'f_almonds', name: 'Almonds', brand: null, emoji: '🥜',
      servingSize: 1, servingUnit: 'oz (28g / ~23 nuts)', custom: false,
      nutrients: {
        calories:164, protein:6, carbs:6, fat:14, fiber:3.5,
        calcium:76, vitaminD:0, vitaminK:0, magnesium:77, phosphorus:137,
        omega3dha:0, omega3epa:0, choline:15, b12:0, folate:14, zinc:1,
        potassium:200, sodium:1, vitaminC:0.1, iron:1.1
      }
    },
    {
      id: 'f_walnuts', name: 'Walnuts', brand: null, emoji: '🥜',
      servingSize: 1, servingUnit: 'oz (28g / ~14 halves)', custom: false,
      nutrients: {
        calories:185, protein:4, carbs:4, fat:18, fiber:1.9,
        calcium:28, vitaminD:0, vitaminK:0.8, magnesium:45, phosphorus:98,
        omega3dha:0, omega3epa:0, choline:11, b12:0, folate:28, zinc:0.9,
        potassium:125, sodium:1, vitaminC:0.4, iron:0.8
      }
    },
    {
      id: 'f_avocado', name: 'Avocado', brand: null, emoji: '🥑',
      servingSize: 0.5, servingUnit: 'medium (100g)', custom: false,
      nutrients: {
        calories:160, protein:2, carbs:9, fat:15, fiber:6.7,
        calcium:12, vitaminD:0, vitaminK:21, magnesium:29, phosphorus:52,
        omega3dha:0, omega3epa:0, choline:14, b12:0, folate:81, zinc:0.6,
        potassium:485, sodium:7, vitaminC:10, iron:0.6
      }
    },
    {
      id: 'f_black_beans', name: 'Black Beans, cooked', brand: null, emoji: '🫘',
      servingSize: 0.5, servingUnit: 'cup cooked (86g)', custom: false,
      nutrients: {
        calories:114, protein:8, carbs:20, fat:0, fiber:7.5,
        calcium:24, vitaminD:0, vitaminK:3, magnesium:60, phosphorus:120,
        omega3dha:0, omega3epa:0, choline:36, b12:0, folate:128, zinc:1,
        potassium:305, sodium:2, vitaminC:0, iron:1.8
      }
    },
    {
      id: 'f_lentils', name: 'Lentils, cooked', brand: null, emoji: '🫘',
      servingSize: 0.5, servingUnit: 'cup cooked (99g)', custom: false,
      nutrients: {
        calories:115, protein:9, carbs:20, fat:0, fiber:7.8,
        calcium:19, vitaminD:0, vitaminK:1.7, magnesium:36, phosphorus:178,
        omega3dha:0, omega3epa:0, choline:37, b12:0, folate:179, zinc:1.3,
        potassium:365, sodium:2, vitaminC:1.5, iron:3.3
      }
    },
    {
      id: 'f_oatmeal', name: 'Oatmeal, cooked', brand: null, emoji: '🥣',
      servingSize: 1, servingUnit: 'cup cooked (234g)', custom: false,
      nutrients: {
        calories:166, protein:6, carbs:28, fat:4, fiber:4,
        calcium:21, vitaminD:0, vitaminK:0.5, magnesium:63, phosphorus:180,
        omega3dha:0, omega3epa:0, choline:18, b12:0, folate:14, zinc:2.3,
        potassium:164, sodium:9, vitaminC:0, iron:2
      }
    },
    {
      id: 'f_orange', name: 'Orange, medium', brand: null, emoji: '🍊',
      servingSize: 1, servingUnit: 'medium (131g)', custom: false,
      nutrients: {
        calories:62, protein:1, carbs:15, fat:0, fiber:3.1,
        calcium:52, vitaminD:0, vitaminK:0, magnesium:13, phosphorus:18,
        omega3dha:0, omega3epa:0, choline:11, b12:0, folate:40, zinc:0.1,
        potassium:237, sodium:0, vitaminC:70, iron:0.1
      }
    },
    {
      id: 'f_chicken', name: 'Chicken Breast, cooked', brand: null, emoji: '🍗',
      servingSize: 1, servingUnit: 'serving (85g / 3oz)', custom: false,
      nutrients: {
        calories:140, protein:26, carbs:0, fat:3, fiber:0,
        calcium:15, vitaminD:0.1, vitaminK:0, magnesium:25, phosphorus:220,
        omega3dha:5, omega3epa:0, choline:80, b12:0.3, folate:4, zinc:0.9,
        potassium:220, sodium:65, vitaminC:0, iron:0.9
      }
    },
    {
      id: 'f_cheddar', name: 'Cheddar Cheese', brand: null, emoji: '🧀',
      servingSize: 1, servingUnit: 'oz (28g)', custom: false,
      nutrients: {
        calories:114, protein:7, carbs:0, fat:9, fiber:0,
        calcium:204, vitaminD:0.1, vitaminK:2.8, magnesium:8, phosphorus:145,
        omega3dha:0, omega3epa:0, choline:15, b12:0.3, folate:5, zinc:0.9,
        potassium:28, sodium:185, vitaminC:0, iron:0.2
      }
    },
    {
      id: 'f_tofu', name: 'Tofu, firm (calcium-set)', brand: null, emoji: '🧆',
      servingSize: 0.5, servingUnit: 'cup (126g)', custom: false,
      nutrients: {
        calories:94, protein:10, carbs:2, fat:6, fiber:0.3,
        calcium:434, vitaminD:0, vitaminK:3.5, magnesium:37, phosphorus:148,
        omega3dha:0, omega3epa:0, choline:35, b12:0, folate:19, zinc:1,
        potassium:150, sodium:9, vitaminC:0.2, iron:3.4
      }
    },
    {
      id: 'f_blueberries', name: 'Blueberries', brand: null, emoji: '🫐',
      servingSize: 1, servingUnit: 'cup (148g)', custom: false,
      nutrients: {
        calories:84, protein:1, carbs:21, fat:0, fiber:3.6,
        calcium:9, vitaminD:0, vitaminK:28.6, magnesium:9, phosphorus:18,
        omega3dha:0, omega3epa:0, choline:9, b12:0, folate:9, zinc:0.2,
        potassium:114, sodium:1, vitaminC:14.4, iron:0.4
      }
    },
    {
      id: 'f_oj_fortified', name: 'Orange Juice, fortified', brand: null, emoji: '🧃',
      servingSize: 1, servingUnit: 'cup (248ml)', custom: false,
      nutrients: {
        calories:112, protein:2, carbs:26, fat:0, fiber:0.5,
        calcium:350, vitaminD:2.5, vitaminK:0, magnesium:27, phosphorus:42,
        omega3dha:0, omega3epa:0, choline:20, b12:0, folate:74, zinc:0.1,
        potassium:496, sodium:5, vitaminC:124, iron:0.5
      }
    },
    {
      id: 'f_bread_wg', name: 'Whole Grain Bread', brand: null, emoji: '🍞',
      servingSize: 1, servingUnit: 'slice (28g)', custom: false,
      nutrients: {
        calories:80, protein:4, carbs:15, fat:1, fiber:2,
        calcium:24, vitaminD:0, vitaminK:1, magnesium:23, phosphorus:73,
        omega3dha:0, omega3epa:0, choline:12, b12:0.1, folate:14, zinc:0.7,
        potassium:95, sodium:135, vitaminC:0, iron:1.1
      }
    },
    {
      id: 'f_cottage', name: 'Cottage Cheese, low-fat', brand: null, emoji: '🫙',
      servingSize: 0.5, servingUnit: 'cup (113g)', custom: false,
      nutrients: {
        calories:90, protein:12, carbs:5, fat:3, fiber:0,
        calcium:100, vitaminD:0, vitaminK:0.5, magnesium:8, phosphorus:190,
        omega3dha:0, omega3epa:0, choline:28, b12:0.6, folate:15, zinc:0.4,
        potassium:97, sodium:360, vitaminC:0, iron:0.1
      }
    },
    {
      id: 'f_kale', name: 'Kale, raw', brand: null, emoji: '🥬',
      servingSize: 1, servingUnit: 'cup (21g)', custom: false,
      nutrients: {
        calories:7, protein:1, carbs:1, fat:0, fiber:1,
        calcium:53, vitaminD:0, vitaminK:113, magnesium:11, phosphorus:22,
        omega3dha:0, omega3epa:0, choline:9, b12:0, folate:19, zinc:0.2,
        potassium:91, sodium:14, vitaminC:19.2, iron:0.3
      }
    },
    {
      id: 'f_liver_beef', name: 'Beef Liver, pan-fried', brand: null, emoji: '🥩',
      servingSize: 1, servingUnit: 'serving (85g / 3oz)', custom: false,
      nutrients: {
        calories:161, protein:25, carbs:4, fat:4, fiber:0,
        calcium:5, vitaminD:0.5, vitaminK:3.5, magnesium:18, phosphorus:389,
        omega3dha:25, omega3epa:0, choline:418, b12:70.7, folate:215, zinc:5.2,
        potassium:299, sodium:63, vitaminC:1.2, iron:5.5
      }
    }
  ];

  const SEED_RECIPES = [
    {
      id: 'r_brain_smoothie',
      name: 'Brain Recovery Smoothie',
      servings: 1,
      ingredients: [
        { foodId: 'f_blueberries', servings: 1 },
        { foodId: 'f_yogurt_greek', servings: 0.5 },
        { foodId: 'f_banana', servings: 0.5 },
        { foodId: 'f_milk_whole', servings: 0.5 }
      ],
      custom: false
    },
    {
      id: 'r_bone_bowl',
      name: 'Bone Health Breakfast Bowl',
      servings: 1,
      ingredients: [
        { foodId: 'f_oatmeal', servings: 1 },
        { foodId: 'f_yogurt_greek', servings: 0.5 },
        { foodId: 'f_blueberries', servings: 0.5 },
        { foodId: 'f_almonds', servings: 0.5 }
      ],
      custom: false
    },
    {
      id: 'r_salmon_plate',
      name: 'Salmon & Broccoli Plate',
      servings: 1,
      ingredients: [
        { foodId: 'f_salmon', servings: 1 },
        { foodId: 'f_broccoli', servings: 1 },
        { foodId: 'f_sweet_potato', servings: 1 }
      ],
      custom: false
    }
  ];

  const seed = () => {
    if (NC.store.get(NC.KEYS.seeded)) return;
    NC.saveFoods(SEED_FOODS);

    // Seed recipes — compute nutrients
    const seededRecipes = SEED_RECIPES.map(r => {
      const nutrients = NC.computeRecipeNutrients(r.ingredients);
      return { ...r, nutrients, createdAt: new Date().toISOString() };
    });
    NC.saveRecipes(seededRecipes);

    NC.store.set(NC.KEYS.seeded, true);
  };

  /* Run seed if NC is ready, else wait */
  if (window.NC) {
    seed();
  } else {
    window.addEventListener('load', seed);
  }
})();
