import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/enrich/route";
import { MAX_STOPS_PER_ENRICH_REQUEST } from "@/types/place";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("place enrichment endpoint", () => {
  it("rejects malformed requests before calling external services", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: "Lisbon", stops: [] }),
    }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests above the 30-stop limit before calling external services", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(MAX_STOPS_PER_ENRICH_REQUEST).toBe(30);
    const response = await POST(new Request("http://localhost/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: "Lisbon",
        stops: Array.from({ length: MAX_STOPS_PER_ENRICH_REQUEST + 1 }, (_, index) => ({
          id: `stop-${index + 1}`,
          name: `Place ${index + 1}`,
        })),
      }),
    }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("geocodes stops and returns only openly licensed Commons photo previews", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        lat: "38.7223",
        lon: "-9.1393",
        display_name: "Praça do Comércio, Lisbon, Portugal",
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        query: {
          pages: {
            "123": {
              imageinfo: [{
                thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/example.jpg",
                descriptionurl: "https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_do_Com%C3%A9rcio.jpg",
                extmetadata: {
                  Artist: { value: "<a href=\"https://commons.wikimedia.org/wiki/User:Artist\">Local photographer</a>" },
                  LicenseShortName: { value: "CC BY-SA 4.0" },
                  LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
                },
              }],
            },
          },
        },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost/api/enrich", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.0.2.40",
      },
      body: JSON.stringify({
        destination: "Lisbon",
        stops: [{ id: "stop-1", name: "Praça do Comércio" }],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.places["stop-1"]).toMatchObject({
      coordinates: { lat: 38.7223, lng: -9.1393 },
      address: "Praça do Comércio, Lisbon, Portugal",
      openStreetMapUrl: expect.stringContaining("openstreetmap.org/?mlat=38.7223"),
      photo: {
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/example.jpg",
        creator: "Local photographer",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_do_Com%C3%A9rcio.jpg",
        licenseName: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ "User-Agent": "WaypointTripPlanner/1.0" });
  });
});
