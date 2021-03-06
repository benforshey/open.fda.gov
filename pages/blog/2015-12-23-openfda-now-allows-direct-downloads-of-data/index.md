---
path: "/update/openfda-now-allows-direct-downloads-of-data"
date: 2015-12-23
title: "OpenFDA Now Allows Direct Downloads of Data"
authors:
  - "OpenFDA Team"
---
Since its launch in June 2014, the impetus for openFDA has been to make it easier to get access to publicly available FDA data. FDA’s goal is to make it simple for an application, mobile device, web developer, or researcher to use data from FDA. .

To date, one major focus of this project has been to  provide high-value APIs (short for Application Programming Interfaces), which make it easy for developers and researchers to query and build upon data related to drug adverse events, drug labeling, medical devices (including adverse events and device registration), and food recalls.

All along, though, we have heard from some users who requested direct access to the data, by download. Today, we’re pleased to make that possible, by adding <a href="/api/reference/#downloads">download functionality</a> to openFDA that allows offline access to the JSON data served by the API.

Two particulars here. First, the data available for download are the same datasets previously available at openFDA. The JSON schema used for the downloads is exactly the same as the output you currently get from the API.

Second, the entire dataset is 23GB compressed, and expands to about 100 GB – so please take necessary precautions before downloading. The download function is not intended to be a primary use case for most openFDA visitors; OpenFDA is designed primarily for queries against our powerful search API. But some applications may require all the data available in a dataset (device recalls, for instance), or exceed the query limits or result limit (5000 records per query) that allow us to promote equitable access and manage load on the system. Today’s addition of downloads serves those needs.

There are two things you should know about these downloads:

* Downloads are broken into parts. Some endpoints have millions of records. For those endpoints, the data are broken up into many small parts. So while some endpoints have all their data available in a single file, others have dozens of files. Each file is a zipped JSON file.

* To keep your downloaded data up to date, you need to re-download the data every time it is updated. Every time an endpoint is updated (which happens on a regular basis; the openFDA status page stays current with the latest update date), it is possible that every record has changed, due to corrections or enhancements. That means that you cannot simply download “new” files to keep your downloaded version up to date. You need to download all available data files for the endpoint of interest.

In the months ahead we will continue to improve openFDA to reflect the needs of our users, community, and the public at large. If you have ideas, please share with  the community at <a class="link-external" href="http://github.com/FDA/openfda">GitHub</a> and <a class="link-external" href="https://opendata.stackexchange.com/questions/tagged/openfda">StackExchange</a>. If your questions or ideas aren’t already there, please tell us what you think! You can also follow the project on Twitter at <a class="link-external" href="https://www.twitter.com/openfda">@openFDA</a> or reach our team at <a href="mailto:open@fda.hhs.gov">open@fda.hhs.gov</a>.
