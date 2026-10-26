// Demo shops near Ghaziabad for local testing.
// Add:    node scripts/seedDemoShops.js
// Remove: node scripts/seedDemoShops.js --remove
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import connectDb from "../config/db.js"
import mongoose from "mongoose"
import User from "../models/user.model.js"
import Shop from "../models/shop.model.js"
import Item from "../models/item.model.js"
dotenv.config()

const DEMO_PASSWORD = "demo1234"
const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`

const demoShops = [
    {
        owner: { fullName: "Rahul Verma", email: "demo.owner1@vingo.test", mobile: "9000000001" },
        name: "Spice Route Kitchen",
        description: "Home-style North Indian curries, biryani and tandoor.",
        image: unsplash("photo-1517248135467-4c7edcad34c4"),
        street: "Crossings Republik, NH-24",
        coordinates: [77.448, 28.633],
        items: [
            { name: "Chicken Curry Thali", price: 220, category: "Main Course", foodType: "non-veg", image: "photo-1585937421612-70a008356fbe", description: "Chicken curry, dal, rice and salad.", rating: { average: 4.5, count: 128 } },
            { name: "Veg Biryani", price: 180, category: "Main Course", foodType: "veg", image: "photo-1563379091339-03b21ab4a4f8", description: "Fragrant basmati rice with mixed vegetables.", rating: { average: 4, count: 86 } },
            { name: "Chicken Tikka", price: 240, category: "North Indian", foodType: "non-veg", image: "photo-1599487488170-d11ec9c172f0", description: "Smoky tandoori chicken skewers.", rating: { average: 4.6, count: 203 } },
        ],
    },
    {
        owner: { fullName: "Amit Chauhan", email: "demo.owner2@vingo.test", mobile: "9000000002" },
        name: "Dragon Wok",
        description: "Indo-Chinese noodles, rice and starters.",
        image: unsplash("photo-1552566626-52f8b828add9"),
        street: "Raj Nagar Extension",
        coordinates: [77.43, 28.69],
        items: [
            { name: "Hakka Noodles", price: 140, category: "Chinese", foodType: "veg", image: "photo-1585032226651-759b368d7246", description: "Wok-tossed noodles with crunchy veggies.", rating: { average: 4.2, count: 64 } },
            { name: "Veg Fried Rice", price: 130, category: "Chinese", foodType: "veg", image: "photo-1512058564366-18510be2db19", description: "Classic fried rice with spring onion.", rating: { average: 3.8, count: 41 } },
        ],
    },
    {
        owner: { fullName: "Neha Sharma", email: "demo.owner3@vingo.test", mobile: "9000000003" },
        name: "Burger & Slice Cafe",
        description: "Pizzas, burgers, sandwiches and shakes.",
        image: unsplash("photo-1555396273-367ea4eb4db5"),
        street: "Shakti Khand, Indirapuram",
        coordinates: [77.37, 28.64],
        items: [
            { name: "Cheese Burst Pizza", price: 299, category: "Pizza", foodType: "veg", image: "photo-1565299624946-b28f40a0ae38", description: "Loaded with cheese and fresh toppings.", rating: { average: 4.4, count: 155 } },
            { name: "Classic Burger", price: 129, category: "Burgers", foodType: "veg", image: "photo-1568901346375-23c9450c58cd", description: "Crispy patty, lettuce and house sauce.", rating: { average: 4.1, count: 92 } },
            { name: "Grilled Cheese Sandwich", price: 99, category: "Sandwiches", foodType: "veg", image: "photo-1528735602780-2552fd46c7af", description: "Golden grilled sandwich with corn and cheese.", rating: { average: 3.6, count: 37 } },
            { name: "Oreo Sundae", price: 149, category: "Desserts", foodType: "veg", image: "photo-1563805042-7684c019e1cb", description: "Ice cream, Oreo crumbs and chocolate sauce.", rating: { average: 4.8, count: 119 } },
        ],
    },
    {
        owner: { fullName: "Suresh Iyer", email: "demo.owner4@vingo.test", mobile: "9000000004" },
        name: "Annapurna Tiffin Centre",
        description: "South Indian breakfast and street snacks.",
        image: unsplash("photo-1606491956689-2ea866880c84"),
        street: "Vijay Nagar",
        coordinates: [77.45, 28.65],
        items: [
            { name: "Idli Sambar", price: 80, category: "South Indian", foodType: "veg", image: "photo-1589301760014-d929f3979dbc", description: "Soft idlis with sambar and coconut chutney.", rating: { average: 4.7, count: 240 } },
            { name: "Idli Vada Combo", price: 110, category: "South Indian", foodType: "veg", image: "photo-1630383249896-424e482df921", description: "Two idlis, one medu vada, sambar and chutneys.", rating: { average: 4.3, count: 77 } },
            { name: "Samosa (2 pcs)", price: 30, category: "Snacks", foodType: "veg", image: "photo-1601050690597-df0568f70950", description: "Crispy samosas with green chutney.", rating: { average: 4.9, count: 312 } },
            { name: "Pav Bhaji", price: 120, category: "Fast Food", foodType: "veg", image: "photo-1606491956689-2ea866880c84", description: "Buttery bhaji with soft pav.", rating: { average: 4.5, count: 180 } },
        ],
    },
]

const removeDemoData = async () => {
    const owners = await User.find({ email: { $in: demoShops.map((shop) => shop.owner.email) } }).select("_id")
    const ownerIds = owners.map((owner) => owner._id)
    const shops = await Shop.find({ owner: { $in: ownerIds } }).select("_id")
    const shopIds = shops.map((shop) => shop._id)

    const { deletedCount: itemCount } = await Item.deleteMany({ shop: { $in: shopIds } })
    const { deletedCount: shopCount } = await Shop.deleteMany({ _id: { $in: shopIds } })
    const { deletedCount: ownerCount } = await User.deleteMany({ _id: { $in: ownerIds } })
    console.log(`Removed ${ownerCount} demo owners, ${shopCount} shops, ${itemCount} items.`)
}

const addDemoData = async () => {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10)

    for (const demo of demoShops) {
        let owner = await User.findOne({ email: demo.owner.email })
        if (!owner) {
            owner = await User.create({ ...demo.owner, password: hashedPassword, role: "owner" })
        }

        if (await Shop.exists({ owner: owner._id })) {
            console.log(`Skipped "${demo.name}" (already exists).`)
            continue
        }

        const shop = await Shop.create({
            name: demo.name,
            description: demo.description,
            owner: owner._id,
            phone: demo.owner.mobile,
            image: demo.image,
            address: { street: demo.street, city: "Ghaziabad", state: "Uttar Pradesh", country: "India" },
            location: { type: "Point", coordinates: demo.coordinates },
            isOpen: true,
        })

        const items = await Item.insertMany(
            demo.items.map((item) => ({ ...item, image: unsplash(item.image), shop: shop._id })),
        )
        shop.items = items.map((item) => item._id)
        await shop.save()
        console.log(`Added "${demo.name}" with ${items.length} items.`)
    }
    console.log(`Demo owners can sign in with password "${DEMO_PASSWORD}".`)
}

try {
    await connectDb()
    if (process.argv.includes("--remove")) {
        await removeDemoData()
    } else {
        await addDemoData()
    }
} catch (error) {
    console.error(error.message)
    process.exitCode = 1
} finally {
    await mongoose.disconnect()
}
