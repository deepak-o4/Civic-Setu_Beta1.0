import asyncio
import logging
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.core import security

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_db")

OFFICERS_TO_SEED = [
    # Admin User
    {
        "name": "Deepak Dubey",
        "email": "heydeepak2004+admin@gmail.com",
        "phone": "9696787763",
        "role": RoleEnum.ADMIN,
        "department": "General Administration",
        "district": "downtown"
    },
    # Water (Water Supply Department)
    {
        "name": "Aarav Kumar",
        "email": "heydeepak2004+water.officer@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "Water Supply Department",
        "district": "downtown"
    },
    {
        "name": "Vikram Singh",
        "email": "heydeepak2004+water.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "Water Supply Department",
        "district": "downtown"
    },
    # Electricity (Electricity Department)
    {
        "name": "Aditya Sharma",
        "email": "heydeepak2004+electricity.officer@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "Electricity Department",
        "district": "downtown"
    },
    {
        "name": "Rakesh Verma",
        "email": "heydeepak2004+electricity.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "Electricity Department",
        "district": "downtown"
    },
    # Roads (Roads & Public Works Department)
    {
        "name": "Rahul Sharma",
        "email": "heydeepak2004+roads.officer@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "Roads & Public Works Department",
        "district": "South West Zone"
    },
    {
        "name": "Sanjay Gupta",
        "email": "heydeepak2004+roads.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "Roads & Public Works Department",
        "district": "South West Zone"
    },
    # Waste (Sanitation & Waste Management Department)
    {
        "name": "Amit Patel",
        "email": "YOUR_NEW_EMAIL_HERE@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "Sanitation & Waste Management Department",
        "district": "downtown"
    },
    {
        "name": "Meera Sen",
        "email": "heydeepak2004+waste.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "Sanitation & Waste Management Department",
        "district": "downtown"
    },
    # Drainage (Drainage & Sewerage Department)
    {
        "name": "Rajesh Singh",
        "email": "heydeepak2004+drainage.officer@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "Drainage & Sewerage Department",
        "district": "downtown"
    },
    {
        "name": "Karan Johar",
        "email": "heydeepak2004+drainage.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "Drainage & Sewerage Department",
        "district": "downtown"
    },
    # Public Facilities (Public Facilities Department)
    {
        "name": "Neha Sharma",
        "email": "heydeepak2004+facilities.officer@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "Public Facilities Department",
        "district": "downtown"
    },
    {
        "name": "Anil Mehta",
        "email": "heydeepak2004+facilities.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "Public Facilities Department",
        "district": "downtown"
    },
    # Other (General Administration)
    {
        "name": "Suresh Kumar",
        "email": "heydeepak2004+general.officer@gmail.com",
        "role": RoleEnum.OFFICER,
        "department": "General Administration",
        "district": "downtown"
    },
    {
        "name": "Preeti Joshi",
        "email": "heydeepak2004+general.head@gmail.com",
        "role": RoleEnum.HEAD,
        "department": "General Administration",
        "district": "downtown"
    }
]

async def seed():
    logger.info("Connecting to database and starting seed operation...")
    async with AsyncSessionLocal() as db:
        hashed_pwd = security.get_password_hash("password123")
        
        for data in OFFICERS_TO_SEED:
            # Delete user if they already exist to reset roles/passwords cleanly
            res = await db.execute(select(User).filter(User.email == data["email"]))
            existing_user = res.scalars().first()
            if existing_user:
                logger.info(f"Removing existing user {data['email']} to re-seed.")
                await db.delete(existing_user)
                await db.commit()
                
            user = User(
                name=data["name"],
                email=data["email"],
                phone=data.get("phone"),
                role=data["role"],
                department=data["department"],
                district=data["district"],
                password=hashed_pwd
            )
            db.add(user)
            logger.info(f"Adding user: {data['name']} ({data['role'].value} under {data['department']} - {data['district']})")
            
        await db.commit()
    logger.info("Database seeding successfully completed!")

if __name__ == "__main__":
    asyncio.run(seed())
