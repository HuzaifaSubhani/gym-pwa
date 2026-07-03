import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://jsonblob.com/api/jsonBlob";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch blob" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to create blob" }, { status: response.status });
    }

    const location = response.headers.get("location");
    if (!location) {
      return NextResponse.json({ error: "No location header returned" }, { status: 500 });
    }

    // Extract ID from the location URL
    const id = location.split("/").pop();
    
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const body = await req.json();
    
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to update blob" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
