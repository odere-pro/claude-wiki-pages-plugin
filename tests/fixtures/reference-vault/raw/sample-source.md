# Provenance in a Knowledge Base

Provenance is the record of where a piece of information came from. In a wiki built
from source documents, every claim on a page should trace back to a specific source.

## Why provenance matters

A knowledge base without provenance is just an unverifiable pile of assertions. When
each claim links to its origin, a reader can check the evidence, weigh competing
sources, and revise the page when a newer source contradicts an older one.

## How it is recorded

Each wiki page lists the sources it draws on. Each source summary, in turn, cites the
raw document it was distilled from. Following the chain from a claim to a page to a
source to the raw file is what makes the knowledge base traceable.

## A worked example

A small reference vault might track a single tool and a single concept, both citing one
source. That is enough to exercise the traceability checks end to end: the tool and the
concept cite the source, and the source cites this raw file.

---

This file is a fixture source bundled with the reference vault. It exists only to satisfy
the invariant that every wiki page traces back to at least one source file under `raw/`.
