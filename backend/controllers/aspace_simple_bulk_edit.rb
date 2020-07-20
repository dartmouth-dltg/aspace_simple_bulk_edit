require 'aspace_logger'

class ArchivesSpaceService < Sinatra::Base
  
  include JSONModel
  
  Endpoint.post('/plugins/aspace_simple_bulk_edit/repositories/:repo_id/summary')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"])
  .permissions([:update_resource_record])
  .returns([200, "[(:dartmouth_bulk_container_update_item)]"]) \
  do
    bulk_updates = AspaceSimpleBulkEditItems.new(params[:uri])

    json_response(resolve_references(bulk_updates.aspace_simple_bulk_edit_items, ["archival_object","archival_object::_resolved::instances::sub_container::top_container"]))
  end
  
  Endpoint.post('/plugins/aspace_simple_bulk_edit/repositories/:repo_id/update')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"]
          )
  .permissions([:update_resource_record])
  .returns([200, :updated]) \
  do
    @simple_bulk_edit_errors = []
    params[:uri].each do |uri_hash|
      ASUtils.json_parse(uri_hash).each_with_index do |ao|
        ao_id = JSONModel.parse_reference(ao['uri'])[:id]
        repo_id = params[:repo_id]
        indicator_2 = ao['child_indicator']
        tc_uri = ao['tc_uri'].nil? ? "" : ao['tc_uri']
        title = ao['title'].nil? ? nil : ao['title']
        
        date = {}
        date["date_type"] = ao["date_type"] unless ao["date_type"].empty?
        date["begin"] = ao["date_begin"] unless ao["date_begin"].empty?
        date["end"] = ao["date_end"] unless ao["date_end"].empty?
        date["expression"] = ao["date_expression"] unless ao["date_expression"].empty?
        
        AspaceSimpleBulkEditUpdate::update_ao(ao_id, title, repo_id, tc_uri, indicator_2, date)
      end
    end
    
    json_response("updated" => params[:uri], "issues" => @simple_bulk_edit_errors)
  end
  
end